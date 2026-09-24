import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(directory, 'data.json');
const recipes = JSON.parse(await fs.readFile(path.join(directory, 'recipes.json'), 'utf8'));
const initialState = () => ({ baby: { birthday: '', nickname: '' }, menu: [], favorites: [], tried: [], triedMenu: [] });
let state;
try { state = { ...initialState(), ...JSON.parse(await fs.readFile(dataFile, 'utf8')) }; }
catch (error) {
	if (error.code !== 'ENOENT') throw error;
	state = initialState();
}

let saving = Promise.resolve();
function save() {
	const snapshot = JSON.stringify(state, null, 2);
	saving = saving.then(async () => {
		const temp = `${dataFile}.tmp`;
		await fs.writeFile(temp, snapshot, 'utf8');
		await fs.rename(temp, dataFile);
	});
	return saving;
}

function send(res, status, data) {
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
	res.end(JSON.stringify(data));
}
async function body(req) {
	let raw = '';
	for await (const part of req) {
		raw += part;
		if (raw.length > 1024 * 1024) throw new Error('请求内容过大');
	}
	return raw ? JSON.parse(raw) : {};
}
function validId(id) { return Number.isSafeInteger(id) && recipes.some(recipe => recipe.id === id); }

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url, 'http://localhost');
		const pathname = url.pathname;
		if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { ok: true });
		if (req.method === 'GET' && pathname === '/api/recipes') return send(res, 200, recipes);
		if (req.method === 'GET' && pathname === '/api/today') {
			const today = new Date().toLocaleDateString('en-CA');
			const seed = [...today].reduce((value, char) => (value * 31 + char.charCodeAt(0)) | 0, 0) >>> 0;
			const birthday = state.baby.birthday;
			const age = birthday ? Math.max(0, (new Date().getFullYear() - Number(birthday.slice(0, 4))) * 12 + new Date().getMonth() + 1 - Number(birthday.slice(5, 7)) - (new Date().getDate() < Number(birthday.slice(8, 10)) ? 1 : 0)) : 0;
			const stage = age < 6 ? 0 : age < 8 ? 1 : age < 12 ? 2 : age < 18 ? 3 : age < 24 ? 4 : 5;
			const stages = ['pre', '6m', '8m', '12m', '18m', '24m'];
			const meals = [
				{ key: 'breakfast', label: '早餐', timeRange: '07:00 - 09:00', emoji: '🌅', color: '#FFB74D' },
				{ key: 'lunch', label: '午餐', timeRange: '11:00 - 13:00', emoji: '☀️', color: '#FF8A65' },
				{ key: 'dinner', label: '晚餐', timeRange: '17:00 - 19:00', emoji: '🌙', color: '#7986CB' }
			].map((meal, index) => {
				const candidates = birthday ? recipes.filter(recipe => recipe.category === meal.key && stages.indexOf(recipe.stage) <= stage) : [];
				return { ...meal, recipe: candidates.length ? candidates[(seed + index) % candidates.length] : null };
			});
			const tips = ['辅食添加遵循“由少到多、由稀到稠、由细到粗”原则', '每引入一种新食物观察 3 天，留意过敏反应', '1 岁以内辅食不加盐、糖等调味料', '保持食材多样化，培养不挑食的好习惯', '让宝宝自己抓握食物，锻炼手眼协调', '辅食尽量现做现吃，避免久放'];
			return send(res, 200, { today, meals, tip: tips[seed % tips.length] });
		}
		if (req.method === 'GET' && pathname.startsWith('/api/recipes/')) {
			const recipe = recipes.find(item => item.id === Number(pathname.split('/').pop()));
			return send(res, recipe ? 200 : 404, recipe || { error: '食谱不存在' });
		}
		if (req.method === 'GET' && pathname === '/api/state') return send(res, 200, state);
		if (req.method === 'PUT' && pathname === '/api/baby') {
			const value = await body(req);
			if (typeof value.birthday !== 'string' || typeof value.nickname !== 'string' ||
				(value.birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthday) || Number.isNaN(Date.parse(value.birthday)) || value.birthday > new Date().toISOString().slice(0, 10))))
				return send(res, 400, { error: '宝宝信息格式无效' });
			state.baby = { birthday: value.birthday, nickname: value.nickname.slice(0, 30) };
			await save();
			return send(res, 200, state.baby);
		}
		if (req.method === 'PUT' && (pathname === '/api/favorites' || pathname === '/api/tried')) {
			const { id, active } = await body(req);
			if (!validId(id) || typeof active !== 'boolean') return send(res, 400, { error: '食谱或状态无效' });
			const key = pathname === '/api/favorites' ? 'favorites' : 'tried';
			state[key] = state[key].filter(value => value !== id);
			if (active) state[key].push(id);
			await save();
			return send(res, 200, state[key]);
		}
		if (pathname === '/api/menu' && req.method === 'POST') {
			const item = await body(req);
			if (!validMenu(item)) return send(res, 400, { error: '菜单内容无效' });
			const created = { ...cleanMenu(item), id: Date.now(), createdAt: new Date().toISOString().slice(0, 10) };
			state.menu.unshift(created);
			await save();
			return send(res, 201, created);
		}
		if (pathname.startsWith('/api/menu/')) {
			const id = Number(pathname.split('/').pop());
			const index = state.menu.findIndex(item => item.id === id);
			if (index < 0) return send(res, 404, { error: '菜单不存在' });
			if (req.method === 'PUT') {
				const item = await body(req);
				if (!validMenu(item)) return send(res, 400, { error: '菜单内容无效' });
				state.menu[index] = { ...state.menu[index], ...cleanMenu(item) };
				await save();
				return send(res, 200, state.menu[index]);
			}
			if (req.method === 'DELETE') {
				state.menu.splice(index, 1);
				state.triedMenu = state.triedMenu.filter(value => value !== id);
				await save();
				return send(res, 200, state.menu);
			}
		}
		if (pathname === '/api/tried-menu' && req.method === 'PUT') {
			const { id, active } = await body(req);
			if (!state.menu.some(item => item.id === id) || typeof active !== 'boolean') return send(res, 400, { error: '菜单或状态无效' });
			state.triedMenu = state.triedMenu.filter(value => value !== id);
			if (active) state.triedMenu.push(id);
			await save();
			return send(res, 200, state.triedMenu);
		}
		if (pathname === '/api/state' && req.method === 'DELETE') {
			state = initialState();
			await save();
			return send(res, 200, state);
		}
		return send(res, 404, { error: '接口不存在' });
	} catch (error) {
		console.error(error);
		return send(res, error instanceof SyntaxError ? 400 : 500, { error: error.message || '服务器错误' });
	}
});

function validMenu(item) {
	return item && typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 80 &&
		['breakfast', 'lunch', 'dinner', 'snack'].includes(item.category) &&
		Array.isArray(item.ingredients) && Array.isArray(item.steps);
}
function cleanMenu(item) {
	return {
		name: item.name.trim(), category: item.category,
		emoji: String(item.emoji || '🍳').slice(0, 8), color: String(item.color || '#FFB74D').slice(0, 20),
		ingredients: item.ingredients.map(String).slice(0, 30), steps: item.steps.map(String).slice(0, 30)
	};
}

const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`Baby Eat API: http://127.0.0.1:${port}/api/health`));
