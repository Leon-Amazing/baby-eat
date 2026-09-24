<template>
	<view class="page">
		<!-- 顶部宝宝信息卡 -->
		<view class="baby-card">
			<view class="baby-avatar">👶</view>
			<view class="baby-info">
				<view class="name-row">
					<text class="baby-name">{{ baby.nickname || '宝宝' }}</text>
					<text class="name-edit" v-if="!editingNickname" @tap="editingNickname = true">编辑昵称</text>
				</view>
				<view class="nickname-row" v-if="editingNickname">
					<input class="nickname-input" v-model="nicknameDraft" placeholder="输入宝宝昵称" maxlength="30" />
					<text class="nickname-save" @tap="saveNickname">保存</text>
					<text class="nickname-cancel" @tap="cancelNickname">取消</text>
				</view>
				<text class="baby-birthday" v-if="baby.birthday">出生：{{ baby.birthday }}</text>
				<text class="baby-age" v-if="baby.birthday">{{ ageText() }} · {{ stageLabel() }}</text>
				<text class="baby-empty" v-else>暂未设置出生年月</text>
			</view>
			<picker class="picker-wrap" mode="date" :value="pickerValue" :end="today" @change="onPickerChange">
				<view class="edit-btn">{{ baby.birthday ? '修改' : '设置' }}</view>
			</picker>
		</view>

		<!-- 食谱统计 -->
		<view class="section">
			<view class="section-title">
				<text class="section-emoji">📊</text>
				<text>食谱统计</text>
			</view>
			<view class="stats-grid">
				<view class="stat-card" v-for="s in stats()" :key="s.label">
					<text class="stat-value">{{ s.value }}</text>
					<text class="stat-label">{{ s.label }}</text>
					<text class="stat-emoji">{{ s.emoji }}</text>
				</view>
			</view>
		</view>

		<!-- 收藏列表入口 -->
		<view class="section">
			<view class="section-title">
				<text class="section-emoji">❤️</text>
				<text>我的收藏</text>
				<text class="section-count">{{ favorites.length }} 个</text>
			</view>
			<view v-if="favoriteRecipes().length" class="fav-list">
				<view class="fav-card" v-for="r in favoriteRecipes()" :key="r.id" @tap="openDetail(r)" hover-class="tap-feedback">
					<view class="fav-thumb" :style="{ background: r.color }">
						<text class="fav-emoji">{{ r.emoji }}</text>
					</view>
					<view class="fav-info">
						<text class="fav-name">{{ r.name }}</text>
						<text class="fav-cat">{{ categoryLabelOf(r.category) }} · {{ stageLabelOf(r.stage) }}</text>
					</view>
					<text class="fav-arrow">›</text>
				</view>
			</view>
			<view v-else class="empty-inline" @tap="openRecipes" hover-class="tap-feedback">
				<text>还没有收藏，去看看食谱 →</text>
			</view>
		</view>

		<!-- 设置 -->
		<view class="section">
			<view class="section-title">
				<text class="section-emoji">⚙️</text>
				<text>设置</text>
			</view>
			<view class="setting-list">
				<view class="setting-item" @tap="onResetBaby" hover-class="tap-feedback">
					<text>重新设置宝宝信息</text>
					<text class="setting-arrow">›</text>
				</view>
				<view class="setting-item" @tap="onClearCache" hover-class="tap-feedback">
					<text>清除所有数据</text>
					<text class="setting-arrow">›</text>
				</view>
				<view class="setting-item about" @tap="onAbout" hover-class="tap-feedback">
					<text>关于</text>
					<text class="version">v1.0.0</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { request, showRequestError } from '@/utils/api.js';
	import { getMonthAge, getStage, STAGE_LABELS, formatAge } from '@/utils/baby.js';
	import { CATEGORY_LABELS } from '@/utils/recipes-data.js';

	export default {
		data() {
			return {
				baby: { birthday: '', nickname: '' },
				nicknameDraft: '',
				editingNickname: false,
				pickerValue: '',
				today: '',
				favorites: [],
				tried: [],
				menuCount: 0,
				recipes: []
			};
		},
		onShow() {
			this.refresh();
		},
		onLoad() {
			const d = new Date();
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			this.today = `${y}-${m}-${day}`;
		},
		methods: {
			ageText() {
				return formatAge(getMonthAge(this.baby.birthday));
			},
			stageLabel() {
				return STAGE_LABELS[getStage(getMonthAge(this.baby.birthday))];
			},
			stats() {
				return [
					{ label: '收藏食谱', value: this.favorites.length, emoji: '❤️' },
					{ label: '已尝试', value: this.tried.length, emoji: '✅' },
					{ label: '自定义菜单', value: this.menuCount, emoji: '📒' },
					{ label: '宝宝日龄', value: this.dayAge(), emoji: '📅' }
				];
			},
			dayAge() {
				if (!this.baby.birthday) return 0;
				const b = new Date(this.baby.birthday.replace(/-/g, '/'));
				if (isNaN(b.getTime())) return 0;
				return Math.max(0, Math.floor((Date.now() - b.getTime()) / 86400000));
			},
			favoriteRecipes() {
				return this.favorites.map(id => this.recipes.find(r => r.id === id)).filter(Boolean);
			},
			async refresh() {
				try {
					const [state, recipes] = await Promise.all([request('/state'), request('/recipes')]);
					this.baby = state.baby;
					this.nicknameDraft = state.baby.nickname;
					this.favorites = state.favorites;
					this.tried = state.tried;
					this.menuCount = state.menu.length;
					this.recipes = recipes;
					this.pickerValue = this.baby.birthday || this.today;
				} catch (error) { showRequestError(error); }
			},
			async onPickerChange(e) {
				const v = e.detail.value;
				if (!v) return;
				try {
					this.baby = await request('/baby', 'PUT', { ...this.baby, birthday: v });
					this.pickerValue = v;
					uni.showToast({ title: '已保存', icon: 'success' });
				} catch (error) { showRequestError(error); }
			},
			async saveNickname() {
				try {
					this.baby = await request('/baby', 'PUT', { ...this.baby, nickname: this.nicknameDraft.trim() });
					this.editingNickname = false;
					uni.showToast({ title: '已保存', icon: 'success' });
				} catch (error) { showRequestError(error); }
			},
			cancelNickname() {
				this.nicknameDraft = this.baby.nickname;
				this.editingNickname = false;
			},
			openRecipes() {
				uni.switchTab({ url: '/pages/recipes/recipes' });
			},
			onResetBaby() {
				uni.showModal({
					title: '重新设置',
					content: '将清空宝宝出生年月信息，确定吗？',
					success: async (r) => {
						if (r.confirm) {
							try {
								this.baby = await request('/baby', 'PUT', { birthday: '', nickname: '' });
								this.nicknameDraft = '';
								this.editingNickname = false;
								this.pickerValue = this.today;
								uni.showToast({ title: '已重置', icon: 'success' });
							} catch (error) { showRequestError(error); }
						}
					}
				});
			},
			onClearCache() {
				uni.showModal({
					title: '清除数据',
					content: '将清除当前设备保存的宝宝信息、菜单、收藏和已尝试记录，确定吗？',
					confirmText: '清除',
					confirmColor: '#dd524d',
					success: async (r) => {
						if (r.confirm) {
							try {
								await request('/state', 'DELETE');
								await this.refresh();
								uni.showToast({ title: '已清除', icon: 'success' });
							} catch (error) { showRequestError(error); }
						}
					}
				});
			},
			onAbout() {
				uni.showModal({
					title: '宝宝今天吃什么',
					content: '版本 v1.0.0\n为新手爸妈打造，记录宝宝的每一顿饭。',
					showCancel: false
				});
			},
			categoryLabelOf(c) {
				return CATEGORY_LABELS[c] || c;
			},
			stageLabelOf(s) {
				return STAGE_LABELS[s];
			},
			openDetail(r) {
				uni.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${r.id}` });
			}
		}
	};
</script>

<style>
	.page {
		min-height: 100vh;
		background: #FFF8F3;
		padding: 24rpx;
		box-sizing: border-box;
	}

	.baby-card {
		background: linear-gradient(135deg, #FFB74D, #FF8A65);
		border-radius: 24rpx;
		padding: 32rpx 28rpx;
		display: flex;
		align-items: center;
		gap: 24rpx;
		box-shadow: 0 8rpx 24rpx rgba(255, 138, 101, 0.3);
	}

	.baby-avatar {
		width: 120rpx;
		height: 120rpx;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 60rpx;
		flex-shrink: 0;
	}

	.baby-info {
		flex: 1;
		min-width: 0;
	}

	.name-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.name-edit {
		font-size: 22rpx;
		color: #fff;
		text-decoration: underline;
		min-height: 80rpx;
		display: flex;
		align-items: center;
	}

	.baby-name {
		font-size: 36rpx;
		font-weight: 600;
		color: #fff;
		display: block;
	}

	.nickname-row {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 8rpx;
	}

	.nickname-input {
		width: 180rpx;
		height: 60rpx;
		padding: 0 12rpx;
		border-radius: 8rpx;
		background: rgba(255, 255, 255, 0.22);
		color: #fff;
		font-size: 22rpx;
	}

	.nickname-save,
	.nickname-cancel {
		color: #fff;
		font-size: 22rpx;
		min-height: 80rpx;
		padding: 0 8rpx;
		display: flex;
		align-items: center;
	}

	.baby-birthday {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.9);
		margin-top: 6rpx;
		display: block;
	}

	.baby-age {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.95);
		margin-top: 4rpx;
		display: block;
	}

	.baby-empty {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 6rpx;
		display: block;
	}

	.picker-wrap {
		display: inline-block;
	}

	.edit-btn {
		padding: 12rpx 28rpx;
		min-height: 80rpx;
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.95);
		color: #FF8A65;
		font-size: 26rpx;
		border-radius: 32rpx;
	}

	.section {
		margin-top: 32rpx;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 12rpx;
		font-size: 30rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 20rpx;
	}

	.section-emoji {
		font-size: 32rpx;
	}

	.section-count {
		margin-left: auto;
		font-size: 24rpx;
		color: #999;
		font-weight: 400;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16rpx;
	}

	.stat-card {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 24rpx;
		position: relative;
		overflow: hidden;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	}

	.stat-value {
		font-size: 48rpx;
		font-weight: 700;
		color: #FF8A65;
		display: block;
	}

	.stat-label {
		font-size: 24rpx;
		color: #666;
		margin-top: 6rpx;
		display: block;
	}

	.stat-emoji {
		position: absolute;
		top: 20rpx;
		right: 20rpx;
		font-size: 40rpx;
		opacity: 0.3;
	}

	.fav-list {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 8rpx 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	}

	.fav-card {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
	}

	.fav-card:last-child {
		border-bottom: none;
	}

	.fav-thumb {
		width: 80rpx;
		height: 80rpx;
		border-radius: 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.fav-emoji {
		font-size: 44rpx;
	}

	.fav-info {
		flex: 1;
	}

	.fav-name {
		font-size: 28rpx;
		color: #333;
		display: block;
	}

	.fav-cat {
		font-size: 22rpx;
		color: #999;
		margin-top: 4rpx;
		display: block;
	}

	.fav-arrow {
		font-size: 36rpx;
		color: #ccc;
	}

	.empty-inline {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 32rpx;
		text-align: center;
		font-size: 24rpx;
		color: #2d5da1;
		font-weight: 700;
		min-height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tap-feedback { opacity: 0.72; }

	.setting-list {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 0 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 28rpx 0;
		font-size: 28rpx;
		color: #333;
		border-bottom: 1rpx solid #f5f5f5;
	}

	.setting-item:last-child {
		border-bottom: none;
	}

	.setting-arrow {
		color: #ccc;
		font-size: 36rpx;
	}

	.setting-item.about {
		color: #999;
		font-size: 26rpx;
	}

	.version {
		color: #ccc;
		font-size: 24rpx;
	}

	/* 手帐纸张主题覆盖 */
	.page { background: transparent; padding: 28rpx 28rpx 60rpx; }
	.baby-card { background: #2d5da1; border: 3rpx solid #2d2d2d; border-radius: 34rpx 16rpx 28rpx 20rpx; box-shadow: 7rpx 7rpx 0 #2d2d2d; transform: rotate(-0.35deg); }
	.baby-avatar { border: 3rpx solid #2d2d2d; border-radius: 44% 56% 48% 52% / 54% 44% 56% 46%; background: #fff9c4; }
	.baby-name, .section-title, .fav-name { font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; font-weight: 700; }
	.nickname-input { background: #fff; border: 2rpx solid #2d2d2d; border-radius: 14rpx 7rpx 15rpx 8rpx; color: #2d2d2d; }
	.nickname-save, .edit-btn { border: 2rpx solid #2d2d2d; border-radius: 14rpx 7rpx 15rpx 8rpx; box-shadow: 3rpx 3rpx 0 #2d2d2d; }
	.nickname-cancel { text-decoration: underline; }
	.edit-btn { background: #fff9c4; color: #2d2d2d; }
	.section-title { color: #2d2d2d; font-size: 34rpx; }
	.section-title::after { content: ""; height: 6rpx; flex: 1; border-top: 2rpx dashed #2d2d2d; margin-left: 12rpx; }
	.stat-card { background: #fff; border: 3rpx solid #2d2d2d; border-radius: 28rpx 12rpx 24rpx 14rpx; box-shadow: 5rpx 5rpx 0 #2d2d2d; }
	.stat-card:nth-child(even) { background: #fff9c4; transform: rotate(0.5deg); }
	.stat-value { color: #ff4d4d; }
	.fav-list, .setting-list { background: #fff; border: 3rpx solid #2d2d2d; border-radius: 22rpx 10rpx 20rpx 12rpx; box-shadow: 5rpx 5rpx 0 #2d2d2d; }
	.fav-card, .setting-item { border-bottom: 2rpx dashed #2d2d2d; }
	.fav-thumb { border: 2rpx solid #2d2d2d; border-radius: 18rpx 8rpx 20rpx 10rpx; }
	.empty-inline { background: #fff9c4; border: 2rpx dashed #2d2d2d; border-radius: 16rpx 8rpx 14rpx 10rpx; color: #2d5da1; }

</style>
