const cloud = require('wx-server-sdk');
const recipes = require('./recipes.json');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 仅在云开发控制台或开发者工具中手动调用，用于把项目内的初始食谱写入 recipes 集合。
exports.main = async () => {
	let inserted = 0;
	let updated = 0;
	for (const recipe of recipes) {
		const existing = await db.collection('recipes').where({ id: recipe.id }).limit(1).get();
		if (existing.data.length) {
			await db.collection('recipes').doc(existing.data[0]._id).update({ data: recipe });
			updated += 1;
		} else {
			await db.collection('recipes').add({ data: recipe });
			inserted += 1;
		}
	}
	return { ok: true, inserted, updated, total: recipes.length };
};
