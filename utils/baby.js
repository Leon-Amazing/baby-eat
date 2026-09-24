/**
 * 宝宝月龄相关计算
 */

/**
 * 根据出生年月计算月龄（取整，向下）
 * @param {string} birthday 'YYYY-MM-DD'
 * @returns {number} 月龄
 */
export function getMonthAge(birthday) {
	if (!birthday) return 0;
	const b = new Date(birthday.replace(/-/g, '/'));
	if (isNaN(b.getTime())) return 0;
	const now = new Date();
	let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
	if (now.getDate() < b.getDate()) months -= 1;
	return Math.max(0, months);
}

/**
 * 根据月龄返回阶段标签
 * 6m+, 8m+, 12m+, 18m+, 24m+
 */
export function getStage(monthAge) {
	if (monthAge < 6) return 'pre'; // 辅食前期
	if (monthAge < 8) return '6m';
	if (monthAge < 12) return '8m';
	if (monthAge < 18) return '12m';
	if (monthAge < 24) return '18m';
	return '24m';
}

export const STAGE_LABELS = {
	pre: '0-6月',
	'6m': '6-8月',
	'8m': '8-12月',
	'12m': '12-18月',
	'18m': '18-24月',
	'24m': '24月+'
};

export const STAGE_ORDER = ['pre', '6m', '8m', '12m', '18m', '24m'];

/**
 * 阶段排序：用于比较宝宝阶段与食谱阶段是否匹配
 * 返回宝宝阶段是否 >= 食谱阶段要求
 */
export function isStageOk(babyStage, recipeStage) {
	const bIdx = STAGE_ORDER.indexOf(babyStage);
	const rIdx = STAGE_ORDER.indexOf(recipeStage);
	if (bIdx < 0 || rIdx < 0) return true;
	return bIdx >= rIdx;
}

/**
 * 把月龄转成更可读的文字
 */
export function formatAge(monthAge) {
	if (monthAge < 12) return `${monthAge} 个月`;
	const years = Math.floor(monthAge / 12);
	const m = monthAge % 12;
	return m === 0 ? `${years} 岁` : `${years} 岁 ${m} 个月`;
}

export default { getMonthAge, getStage, STAGE_LABELS, STAGE_ORDER, isStageOk, formatAge };
