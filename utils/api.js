import { staticRequest } from '@/utils/static-api.js';

// 静态发布模式：所有数据都在小程序包或当前设备本地存储中，运行时不会发起网络请求。
export function request(path, method = 'GET', data) {
	return staticRequest(path, method, data);
}

export function showRequestError(error) {
	uni.showToast({ title: error?.message || '数据处理失败，请稍后重试', icon: 'none' });
}
