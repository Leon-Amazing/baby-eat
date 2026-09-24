import { RECIPES } from './recipes-data.js';
import { localDateKey, localDayNumber } from './local-date.js';

const STORAGE_KEY = 'baby_eat_static_state_v1';
const stages = ['pre', '6m', '8m', '12m', '18m', '24m'];
const tips = [
	'辅食添加遵循“由少到多、由稀到稠、由细到粗”原则',
	'每引入一种新食物观察 3 天，留意过敏反应',
	'1 岁以内辅食不加盐、糖等调味料',
	'保持食材多样化，培养不挑食的好习惯',
	'让宝宝自己抓握食物，锻炼手眼协调',
	'辅食尽量现做现吃，避免久放'
];

function emptyState() {
	return { baby: { birthday: '', nickname: '' }, menu: [], favorites: [], tried: [], triedMenu: [] };
}

function getState() {
	try {
		const saved = uni.getStorageSync(STORAGE_KEY);
		return {
			...emptyState(),
			...(saved && typeof saved === 'object' ? saved : {}),
			baby: { ...emptyState().baby, ...(saved?.baby || {}) }
		};
	} catch (error) {
		return emptyState();
	}
}

function saveState(state) {
	uni.setStorageSync(STORAGE_KEY, state);
}

export function staticRequest(path, method = 'GET', data = {}) {
	try {
		const state = getState();
		let result;
		if (method === 'GET' && path === '/health') result = { static: true };
		else if (method === 'GET' && path === '/recipes') result = RECIPES;
		else if (method === 'GET' && path.startsWith('/recipes/')) {
			result = RECIPES.find(item => item.id === Number(path.split('/').pop()));
			if (!result) throw new Error('食谱不存在');
		} else if (method === 'GET' && path === '/state') result = state;
		else if (method === 'GET' && path === '/today') result = todayRecommendation(state.baby.birthday);
		else if (method === 'PUT' && path === '/baby') {
			if (!validBaby(data)) throw new Error('宝宝信息格式无效');
			state.baby = { birthday: data.birthday, nickname: data.nickname.trim().slice(0, 30) };
			saveState(state);
			result = state.baby;
		} else if (method === 'PUT' && (path === '/favorites' || path === '/tried')) {
			if (!validRecipeId(data.id) || typeof data.active !== 'boolean') throw new Error('食谱或状态无效');
			const key = path === '/favorites' ? 'favorites' : 'tried';
			state[key] = setMembership(state[key], data.id, data.active);
			saveState(state);
			result = state[key];
		} else if (method === 'POST' && path === '/menu') {
			if (!validMenu(data)) throw new Error('菜单内容无效');
			result = { ...cleanMenu(data), id: Date.now(), createdAt: localDateKey() };
			state.menu.unshift(result);
			saveState(state);
		} else if (path.startsWith('/menu/')) {
			result = updateMenu(state, path, method, data);
		} else if (method === 'PUT' && path === '/tried-menu') {
			if (!state.menu.some(item => item.id === data.id) || typeof data.active !== 'boolean') throw new Error('菜单或状态无效');
			state.triedMenu = setMembership(state.triedMenu, data.id, data.active);
			saveState(state);
			result = state.triedMenu;
		} else if (method === 'DELETE' && path === '/state') {
			saveState(emptyState());
			result = emptyState();
		} else {
			throw new Error('接口不存在');
		}
		return Promise.resolve(result);
	} catch (error) {
		return Promise.reject(error);
	}
}

function updateMenu(state, path, method, data) {
	const id = Number(path.split('/').pop());
	const index = state.menu.findIndex(item => item.id === id);
	if (index < 0) throw new Error('菜单不存在');
	if (method === 'PUT') {
		if (!validMenu(data)) throw new Error('菜单内容无效');
		state.menu[index] = { ...state.menu[index], ...cleanMenu(data) };
		saveState(state);
		return state.menu[index];
	}
	if (method === 'DELETE') {
		state.menu.splice(index, 1);
		state.triedMenu = state.triedMenu.filter(value => value !== id);
		saveState(state);
		return state.menu;
	}
	throw new Error('接口不存在');
}

export function todayRecommendation(birthday, now = new Date()) {
	const today = localDateKey(now);
	const dayNumber = localDayNumber(now);
	const age = monthAge(birthday, now);
	const stageIndex = age < 6 ? 0 : age < 8 ? 1 : age < 12 ? 2 : age < 18 ? 3 : age < 24 ? 4 : 5;
	const meals = [
		{ key: 'breakfast', label: '早餐', timeRange: '07:00 - 09:00', emoji: '🌅', color: '#FFB74D' },
		{ key: 'lunch', label: '午餐', timeRange: '11:00 - 13:00', emoji: '☀️', color: '#FF8A65' },
		{ key: 'dinner', label: '晚餐', timeRange: '17:00 - 19:00', emoji: '🌙', color: '#7986CB' }
	].map((meal, index) => {
		const candidates = birthday ? RECIPES.filter(recipe => recipe.category === meal.key && stages.indexOf(recipe.stage) <= stageIndex) : [];
		// 同一日结果稳定；候选池不变且有两道以上时，隔天轮到下一道。
		return { ...meal, recipe: candidates.length ? candidates[(dayNumber + index) % candidates.length] : null };
	});
	return { today, meals, tip: tips[dayNumber % tips.length] };
}

function monthAge(birthday, now = new Date()) {
	if (!birthday) return 0;
	let months = (now.getFullYear() - Number(birthday.slice(0, 4))) * 12 + now.getMonth() + 1 - Number(birthday.slice(5, 7));
	if (now.getDate() < Number(birthday.slice(8, 10))) months -= 1;
	return Math.max(0, months);
}

function validBaby(value) {
	return value && typeof value.birthday === 'string' && typeof value.nickname === 'string' && (!value.birthday || (/^\d{4}-\d{2}-\d{2}$/.test(value.birthday) && !Number.isNaN(Date.parse(value.birthday)) && value.birthday <= localDateKey()));
}

function validMenu(item) {
	return item && typeof item.name === 'string' && item.name.trim() && item.name.length <= 80 && ['breakfast', 'lunch', 'dinner', 'snack'].includes(item.category) && Array.isArray(item.ingredients) && Array.isArray(item.steps);
}

function cleanMenu(item) {
	return { name: item.name.trim(), category: item.category, emoji: String(item.emoji || '🍳').slice(0, 8), color: String(item.color || '#FFB74D').slice(0, 20), ingredients: item.ingredients.map(String).slice(0, 30), steps: item.steps.map(String).slice(0, 30) };
}

function validRecipeId(id) {
	return Number.isSafeInteger(id) && RECIPES.some(recipe => recipe.id === id);
}

function setMembership(values, id, active) {
	return active ? [...new Set([...values, id])] : values.filter(value => value !== id);
}
