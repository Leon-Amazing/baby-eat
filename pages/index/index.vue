<template>
	<view class="page">
		<!-- 顶部宝宝信息卡 -->
		<view class="baby-card">
			<view class="baby-avatar">👶</view>
			<view class="baby-info">
				<view class="baby-name-row">
					<text class="baby-name">{{ baby.nickname || '宝宝' }}</text>
					<text class="baby-age" v-if="baby.birthday">{{ ageText() }}</text>
				</view>
				<text class="baby-stage" v-if="baby.birthday">阶段：{{ stageLabel() }}</text>
				<picker class="picker-wrap" mode="date" :value="pickerValue" :end="today" @change="onPickerChange">
					<view class="baby-set-btn" v-if="!baby.birthday"><text>设置宝宝出生年月</text></view>
					<view class="baby-edit-btn" v-else><text>修改出生年月</text></view>
				</picker>
			</view>
		</view>

		<!-- 今日推荐 -->
		<view class="section">
			<view class="section-title">
				<text class="section-emoji">🍴</text>
				<text>今日推荐</text>
				<text class="section-date">{{ today }}</text>
			</view>

			<view v-if="!baby.birthday" class="empty-tip">
				<text class="empty-emoji">🍼</text>
				<text class="empty-text">请先设置宝宝出生年月，再获取今日推荐</text>
			</view>

			<view v-else class="meal-list">
				<view class="meal-card" v-for="meal in meals" :key="meal.key" @tap="onMealTap(meal)">
					<view class="meal-icon" :style="{ background: meal.color }">{{ meal.emoji }}</view>
					<view class="meal-content">
						<view class="meal-header">
							<text class="meal-name">{{ meal.label }}</text>
							<text class="meal-time">{{ meal.timeRange }}</text>
						</view>
						<view v-if="meal.recipe" class="meal-recipe">
							<text class="recipe-emoji-lg">{{ meal.recipe.emoji }}</text>
							<view class="recipe-info">
								<text class="recipe-title">{{ meal.recipe.name }}</text>
								<view class="recipe-tags">
									<text class="tag" v-for="t in meal.recipe.tags" :key="t">{{ t }}</text>
								</view>
								<text class="recipe-time">⏱️ {{ meal.recipe.cookTime }} 分钟</text>
							</view>
						</view>
						<view v-else class="meal-empty">
							<text>暂无适合该月龄的食谱，去看看更多 →</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 今日小贴士 -->
		<view class="tips-card">
			<view class="tips-title">💡 今日小贴士</view>
			<text class="tips-text">{{ dailyTip }}</text>
		</view>
	</view>
</template>

<script>
	import { request, showRequestError } from '@/utils/api.js';
	import { getMonthAge, getStage, STAGE_LABELS, formatAge } from '@/utils/baby.js';
	import { localDateKey } from '@/utils/local-date.js';

	export default {
		data() {
			return {
				baby: { birthday: '', nickname: '' },
				pickerValue: '',
				today: '',
				meals: [],
				dailyTip: ''
			};
		},
		onShow() {
			this.refresh();
		},
		onLoad() {
			this.today = localDateKey();
		},
		methods: {
			ageText() {
				const age = getMonthAge(this.baby.birthday);
				return formatAge(age);
			},
			stageLabel() {
				return STAGE_LABELS[getStage(getMonthAge(this.baby.birthday))];
			},
			async refresh() {
				try {
					this.today = localDateKey();
					const state = await request('/state');
					this.baby = state.baby;
					const result = await request('/today');
					this.today = result.today;
					this.pickerValue = this.baby.birthday || result.today;
					this.meals = result.meals;
					this.dailyTip = result.tip;
				} catch (error) { showRequestError(error); }
			},
			async onPickerChange(e) {
				const v = e.detail.value;
				if (!v) return;
				try {
					this.baby = await request('/baby', 'PUT', { ...this.baby, birthday: v });
					await this.refresh();
					uni.showToast({ title: '已保存', icon: 'success' });
				} catch (error) { showRequestError(error); }
			},
			onMealTap(meal) {
				if (!this.baby.birthday) {
					uni.showToast({ title: '请先设置宝宝出生年月', icon: 'none' });
					return;
				}
				if (meal.recipe) {
					uni.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${meal.recipe.id}` });
				} else {
					uni.switchTab({ url: '/pages/recipes/recipes' });
				}
			}
		}
	};
</script>

<style>
	.page {
		min-height: 100vh;
		background: linear-gradient(180deg, #FF8A65 0%, #FFB74D 240rpx, #FFF8F3 480rpx);
		padding: 32rpx 24rpx 48rpx;
		box-sizing: border-box;
	}

	.baby-card {
		background: #FFFFFF;
		border-radius: 24rpx;
		padding: 32rpx 28rpx;
		display: flex;
		align-items: center;
		box-shadow: 0 8rpx 24rpx rgba(255, 138, 101, 0.18);
		position: relative;
		overflow: hidden;
	}

	.baby-avatar {
		width: 120rpx;
		height: 120rpx;
		background: linear-gradient(135deg, #FFB74D, #FF8A65);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 60rpx;
		margin-right: 24rpx;
		flex-shrink: 0;
	}

	.baby-info {
		flex: 1;
	}

	.baby-name-row {
		display: flex;
		align-items: baseline;
		gap: 16rpx;
	}

	.baby-name {
		font-size: 36rpx;
		font-weight: 600;
		color: #333;
	}

	.baby-age {
		font-size: 24rpx;
		color: #FF8A65;
	}

	.baby-stage {
		font-size: 24rpx;
		color: #999;
		margin-top: 8rpx;
		display: block;
	}

	.baby-set-btn,
	.baby-edit-btn {
		margin-top: 16rpx;
		display: inline-block;
		padding: 8rpx 24rpx;
		font-size: 24rpx;
		background: #FF8A65;
		color: #fff;
		border-radius: 24rpx;
	}

	.baby-edit-btn {
		background: #FFF0E6;
		color: #FF8A65;
	}

	.picker-wrap {
		display: inline-block;
	}

	.section {
		margin-top: 32rpx;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 12rpx;
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 20rpx;
	}

	.section-emoji {
		font-size: 36rpx;
	}

	.section-date {
		margin-left: auto;
		font-size: 24rpx;
		color: #999;
		font-weight: 400;
	}

	.empty-tip {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 60rpx 0;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20rpx;
	}

	.empty-emoji {
		font-size: 80rpx;
	}

	.empty-text {
		font-size: 26rpx;
		color: #999;
	}

	.meal-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.meal-card {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 24rpx;
		display: flex;
		gap: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	}

	.meal-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 40rpx;
		flex-shrink: 0;
	}

	.meal-content {
		flex: 1;
	}

	.meal-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.meal-name {
		font-size: 30rpx;
		font-weight: 600;
		color: #333;
	}

	.meal-time {
		font-size: 22rpx;
		color: #999;
	}

	.meal-recipe {
		display: flex;
		gap: 16rpx;
		margin-top: 16rpx;
		background: #FAFAFA;
		padding: 16rpx;
		border-radius: 14rpx;
	}

	.recipe-emoji-lg {
		font-size: 56rpx;
		width: 80rpx;
		text-align: center;
		flex-shrink: 0;
	}

	.recipe-info {
		flex: 1;
	}

	.recipe-title {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
		display: block;
	}

	.recipe-tags {
		margin-top: 6rpx;
		display: flex;
		gap: 8rpx;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 20rpx;
		padding: 2rpx 12rpx;
		border-radius: 10rpx;
		background: #FFE0D6;
		color: #FF8A65;
	}

	.recipe-time {
		font-size: 22rpx;
		color: #999;
		margin-top: 8rpx;
		display: block;
	}

	.meal-empty {
		margin-top: 16rpx;
		padding: 16rpx;
		background: #FAFAFA;
		border-radius: 14rpx;
		font-size: 24rpx;
		color: #999;
	}

	.tips-card {
		margin-top: 32rpx;
		background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
		border-radius: 20rpx;
		padding: 24rpx;
	}

	.tips-title {
		font-size: 26rpx;
		font-weight: 600;
		color: #FF8A65;
		margin-bottom: 12rpx;
	}

	.tips-text {
		font-size: 24rpx;
		color: #6D4C41;
		line-height: 1.6;
	}

	/* 手帐纸张主题覆盖 */
	.page { background: transparent; padding: 28rpx 28rpx 56rpx; }
	.baby-card, .meal-card, .empty-tip { border: 3rpx solid #2d2d2d; border-radius: 38rpx 18rpx 32rpx 22rpx / 20rpx 34rpx 18rpx 32rpx; box-shadow: 7rpx 7rpx 0 #2d2d2d; }
	.baby-card { overflow: visible; background: #fff9c4; transform: rotate(-0.4deg); }
	.baby-avatar { border: 3rpx solid #2d2d2d; border-radius: 46% 54% 52% 48% / 54% 42% 58% 46%; background: #ffcf70; }
	.baby-name, .section-title, .meal-name { color: #2d2d2d; font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; font-weight: 700; }
	.baby-set-btn, .baby-edit-btn { border: 2rpx solid #2d2d2d; border-radius: 20rpx 10rpx 22rpx 12rpx; box-shadow: 3rpx 3rpx 0 #2d2d2d; background: #ff4d4d; color: #fff; }
	.baby-edit-btn { background: #fff; color: #2d2d2d; }
	.section-title { font-size: 36rpx; letter-spacing: 2rpx; }
	.section-title::after { content: ""; height: 6rpx; flex: 1; margin-left: 12rpx; border-top: 2rpx dashed #2d2d2d; transform: rotate(-1deg); }
	.section-date { color: #2d5da1; font-weight: 600; }
	.meal-card { background: #fff; box-shadow: 5rpx 5rpx 0 #2d2d2d; }
	.meal-card:nth-child(even) { transform: rotate(0.35deg); }
	.meal-icon { border: 2rpx solid #2d2d2d; border-radius: 24rpx 16rpx 25rpx 14rpx; }
	.meal-recipe, .meal-empty { background: #fdfbf7; border: 2rpx dashed #2d2d2d; border-radius: 18rpx 10rpx 16rpx 12rpx; }
	.tag { background: #fff9c4; color: #2d2d2d; border: 1rpx solid #2d2d2d; border-radius: 12rpx 6rpx 14rpx 7rpx; }
	.tips-card { background: #fff9c4; border: 3rpx solid #2d2d2d; border-radius: 18rpx 38rpx 18rpx 28rpx / 25rpx 20rpx 34rpx 16rpx; box-shadow: 6rpx 6rpx 0 #2d2d2d; transform: rotate(0.45deg); }
	.tips-title { color: #ff4d4d; font-weight: 700; }
	.tips-text { color: #2d2d2d; }

</style>
