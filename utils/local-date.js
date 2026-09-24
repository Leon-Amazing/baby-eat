// 统一使用设备本地日历日；Date#toISOString() 会把北京时间凌晨算作前一天。
export function localDateKey(date = new Date()) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// 用本地年月日换算连续日序号，不受夏令时一天长短影响。
export function localDayNumber(date = new Date()) {
	return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
