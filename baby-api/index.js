const cloud = require('wx-server-sdk');
const packagedRecipes = require('./recipes.json');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const STATES = 'baby_states';
const RECIPES = 'recipes';

const initialState = () => ({ baby: { birthday: '', nickname: '' }, menu: [], favorites: [], tried: [], triedMenu: [] });

exports.main = async (event) => {
	try {
		const { path, method = 'GET', data = {} } = event || {};
		const { OPENID } = cloud.getWXContext();
		if (!OPENID) return fail('无法识别当前用户');
		const recipes = await getRecipes();

		if (method === 'GET' && path === '/health') return ok({ cloud: true });
		if (method === 'GET' && path === '/recipes') return ok(recipes);
		if (method === 'GET' && path.startsWith('/recipes/')) {
			const recipe = recipes.find(item => item.id === Number(path.split('/').pop()));
			return recipe ? ok(recipe) : fail('食谱不存在');
		}

		const state = await getState(OPENID);
		if (method === 'GET' && path === '/state') return ok(publicState(state));
		if (method === 'GET' && path === '/today') return ok(todayRecommendation(state.baby.birthday, recipes));

		if (method === 'PUT' && path === '/baby') {
			if (!validBaby(data)) return fail('宝宝信息格式无效');
			state.baby = { birthday: data.birthday, nickname: data.nickname.trim().slice(0, 30) };
			await saveState(state);
			return ok(state.baby);
		}
		if (method === 'PUT' && (path === '/favorites' || path === '/tried')) {
			if (!validRecipeId(data.id, recipes) || typeof data.active !== 'boolean') return fail('食谱或状态无效');
			const key = path === '/favorites' ? 'favorites' : 'tried';
			state[key] = setMembership(state[key], data.id, data.active);
			await saveState(state);
			return ok(state[key]);
		}
		if (method === 'POST' && path === '/menu') {
			if (!validMenu(data)) return fail('菜单内容无效');
			const menu = { ...cleanMenu(data), id: Date.now(), createdAt: new Date().toISOString().slice(0, 10) };
			state.menu.unshift(menu);
			await saveState(state);
			return ok(menu);
		}
		if (path.startsWith('/menu/')) return updateMenu(state, path, method, data);
		if (method === 'PUT' && path === '/tried-menu') {
			if (!state.menu.some(item => item.id === data.id) || typeof data.active !== 'boolean') return fail('菜单或状态无效');
			state.triedMenu = setMembership(state.triedMenu, data.id, data.active);
			await saveState(state);
			return ok(state.triedMenu);
		}
		if (method === 'DELETE' && path === '/state') {
			state.baby = initialState().baby;
			state.menu = [];
			state.favorites = [];
			state.tried = [];
			state.triedMenu = [];
			await saveState(state);
			return ok(publicState(state));
		}
		return fail('接口不存在');
	} catch (error) {
		console.error(error);
		return fail(error.message || '云函数执行失败');
	}
};

async function getRecipes() {
	const result = await db.collection(RECIPES).orderBy('id', 'asc').limit(100).get();
	return result.data.length ? result.data.map(stripMeta) : packagedRecipes;
}
async function getState(openid) {
	const result = await db.collection(STATES).where({ _openid: openid }).limit(1).get();
	if (result.data.length) return { ...initialState(), ...result.data[0] };
	const state = { ...initialState(), _openid: openid, updatedAt: db.serverDate() };
	const created = await db.collection(STATES).add({ data: state });
	return { ...state, _id: created._id };
}
async function saveState(state) {
	const data = { baby: state.baby, menu: state.menu, favorites: state.favorites, tried: state.tried, triedMenu: state.triedMenu, updatedAt: db.serverDate() };
	await db.collection(STATES).doc(state._id).update({ data });
}
function publicState(state) {
	const { baby, menu, favorites, tried, triedMenu } = state;
	return { baby, menu, favorites, tried, triedMenu };
}
async function updateMenu(state, path, method, data) {
	const id = Number(path.split('/').pop());
	const index = state.menu.findIndex(item => item.id === id);
	if (index < 0) return fail('菜单不存在');
	if (method === 'PUT') {
		if (!validMenu(data)) return fail('菜单内容无效');
		state.menu[index] = { ...state.menu[index], ...cleanMenu(data) };
		await saveState(state);
		return ok(state.menu[index]);
	}
	if (method === 'DELETE') {
		state.menu.splice(index, 1);
		state.triedMenu = state.triedMenu.filter(value => value !== id);
		await saveState(state);
		return ok(state.menu);
	}
	return fail('接口不存在');
}
function todayRecommendation(birthday, recipes) {
	const today = new Date().toISOString().slice(0, 10);
	const seed = [...today].reduce((value, char) => (value * 31 + char.charCodeAt(0)) | 0, 0) >>> 0;
	const age = monthAge(birthday);
	const stages = ['pre', '6m', '8m', '12m', '18m', '24m'];
	const stageIndex = age < 6 ? 0 : age < 8 ? 1 : age < 12 ? 2 : age < 18 ? 3 : age < 24 ? 4 : 5;
	const meals = [
		{ key: 'breakfast', label: '早餐', timeRange: '07:00 - 09:00', emoji: '🌅', color: '#FFB74D' },
		{ key: 'lunch', label: '午餐', timeRange: '11:00 - 13:00', emoji: '☀️', color: '#FF8A65' },
		{ key: 'dinner', label: '晚餐', timeRange: '17:00 - 19:00', emoji: '🌙', color: '#7986CB' }
	].map((meal, index) => {
		const candidates = birthday ? recipes.filter(recipe => recipe.category === meal.key && stages.indexOf(recipe.stage) <= stageIndex) : [];
		return { ...meal, recipe: candidates.length ? candidates[(seed + index) % candidates.length] : null };
	});
	const tips = ['辅食添加遵循“由少到多、由稀到稠、由细到粗”原则', '每引入一种新食物观察 3 天，留意过敏反应', '1 岁以内辅食不加盐、糖等调味料', '保持食材多样化，培养不挑食的好习惯', '让宝宝自己抓握食物，锻炼手眼协调', '辅食尽量现做现吃，避免久放'];
	return { today, meals, tip: tips[seed % tips.length] };
}
function monthAge(birthday) {
	if (!birthday) return 0;
	const now = new Date();
	let months = (now.getFullYear() - Number(birthday.slice(0, 4))) * 12 + now.getMonth() + 1 - Number(birthday.slice(5, 7));
	if (now.getDate() < Number(birthday.slice(8, 10))) months -= 1;
	return Math.max(0, months);
}
function validBaby(value) {
	return value && typeof value.birthday === 'string' && typeof value.nickname === 'string' && (!value.birthday || (/^\d{4}-\d{2}-\d{2}$/.test(value.birthday) && !Number.isNaN(Date.parse(value.birthday)) && value.birthday <= new Date().toISOString().slice(0, 10)));
}
function validMenu(item) {
	return item && typeof item.name === 'string' && item.name.trim() && item.name.length <= 80 && ['breakfast', 'lunch', 'dinner', 'snack'].includes(item.category) && Array.isArray(item.ingredients) && Array.isArray(item.steps);
}
function cleanMenu(item) {
	return { name: item.name.trim(), category: item.category, emoji: String(item.emoji || '🍳').slice(0, 8), color: String(item.color || '#FFB74D').slice(0, 20), ingredients: item.ingredients.map(String).slice(0, 30), steps: item.steps.map(String).slice(0, 30) };
}
function validRecipeId(id, recipes) { return Number.isSafeInteger(id) && recipes.some(recipe => recipe.id === id); }
function setMembership(values, id, active) { return active ? [...new Set([...values, id])] : values.filter(value => value !== id); }
function stripMeta(item) { const { _id, _openid, ...recipe } = item; return recipe; }
function ok(data) { return { ok: true, data }; }
function fail(error) { return { ok: false, error }; }
