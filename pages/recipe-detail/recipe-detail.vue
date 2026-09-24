<template>
	<view class="page">
		<view v-if="recipe" class="detail">
			<!-- 顶部大图 -->
			<view class="hero" :style="{ background: recipe.color }">
				<text class="hero-emoji">{{ recipe.emoji }}</text>
				<view class="hero-overlay">
					<text class="hero-name">{{ recipe.name }}</text>
					<view class="hero-tags">
						<text class="hero-tag" v-for="t in recipe.tags" :key="t">{{ t }}</text>
					</view>
				</view>
			</view>

			<!-- 概要信息 -->
			<view class="summary-card">
				<view class="summary-item">
					<text class="summary-emoji">🍽️</text>
					<text class="summary-label">餐次</text>
					<text class="summary-value">{{ categoryLabel() }}</text>
				</view>
				<view class="summary-item">
					<text class="summary-emoji">📅</text>
					<text class="summary-label">月龄</text>
					<text class="summary-value">{{ stageLabel() }}</text>
				</view>
				<view class="summary-item">
					<text class="summary-emoji">⏱️</text>
					<text class="summary-label">用时</text>
					<text class="summary-value">{{ recipe.cookTime }} 分钟</text>
				</view>
			</view>

			<!-- 营养 -->
			<view class="section">
				<view class="section-title">
					<text class="section-emoji">🌟</text>
					<text>营养亮点</text>
				</view>
				<view class="nutrition-box">
					<text>{{ recipe.nutrition }}</text>
				</view>
			</view>

			<!-- 质地与安全提示 -->
			<view class="section safety-section" v-if="recipe.texture || recipe.safety">
				<view class="section-title">
					<text class="section-emoji">🛡️</text>
					<text>质地与安全提示</text>
				</view>
				<view class="safety-box">
					<view class="safety-row" v-if="recipe.texture">
						<text class="safety-label">建议质地</text>
						<text class="safety-content">{{ recipe.texture }}</text>
					</view>
					<view class="safety-row" v-if="allergenText()">
						<text class="safety-label warning">过敏原</text>
						<text class="safety-content">{{ allergenText() }}</text>
					</view>
					<view class="safety-tip" v-for="(tip, index) in recipe.safety || []" :key="index">
						<text>• {{ tip }}</text>
					</view>
				</view>
			</view>

			<!-- 食材 -->
			<view class="section">
				<view class="section-title">
					<text class="section-emoji">🥬</text>
					<text>食材</text>
				</view>
				<view class="ingredients">
					<view class="ingredient" v-for="(ing, idx) in recipe.ingredients" :key="idx">
						<text class="ingredient-dot">●</text>
						<text class="ingredient-text">{{ ing }}</text>
					</view>
				</view>
			</view>

			<!-- 做法 -->
			<view class="section">
				<view class="section-title">
					<text class="section-emoji">👨‍🍳</text>
					<text>做法步骤</text>
				</view>
				<view class="steps">
					<view class="step" v-for="(s, idx) in recipe.steps" :key="idx">
						<view class="step-num">{{ idx + 1 }}</view>
						<view class="step-text">{{ s }}</view>
					</view>
				</view>
			</view>

			<view class="section" v-if="recipe.source">
				<view class="section-title">
					<text class="section-emoji">📚</text>
					<text>食谱出处</text>
				</view>
				<view class="source-box">
					<text class="source-label">{{ recipe.source.label }}</text>
					<text class="source-url" selectable>{{ recipe.source.url }}</text>
					<view class="source-copy" @tap="copySource">复制原文链接</view>
				</view>
			</view>

			<!-- 底部操作 -->
			<view class="footer-bar">
				<view class="footer-btn fav" @tap="onFav">
					<text>{{ isFav ? '❤️' : '🤍' }}</text>
					<text class="footer-btn-text">{{ isFav ? '已收藏' : '收藏' }}</text>
				</view>
				<view class="footer-btn try" @tap="onTry">
					<text>✅</text>
					<text class="footer-btn-text">{{ isTried ? '已尝试' : '标记已做' }}</text>
				</view>
				<view class="footer-btn share" @tap="onShare">
					<text>📤</text>
					<text class="footer-btn-text">分享</text>
				</view>
			</view>
		</view>

		<view v-else class="empty">
			<text class="empty-emoji">😕</text>
			<text>食谱不存在</text>
		</view>
	</view>
</template>

<script>
	import { CATEGORY_LABELS } from '@/utils/recipes-data.js';
	import { STAGE_LABELS } from '@/utils/baby.js';
	import { request, showRequestError } from '@/utils/api.js';

	export default {
		data() {
			return {
				id: null,
				recipe: null,
				isFav: false,
				isTried: false
			};
		},
		onLoad(options) {
			const id = Number(options.id);
			this.id = id;
		},
		onShow() {
			if (this.id) this.refresh();
		},
		methods: {
			allergenText() {
				return this.recipe?.allergens?.length ? this.recipe.allergens.join('、') : '';
			},
			categoryLabel() {
				return this.recipe ? CATEGORY_LABELS[this.recipe.category] : '';
			},
			stageLabel() {
				return this.recipe ? STAGE_LABELS[this.recipe.stage] : '';
			},
			async refresh() {
				if (!this.id) return;
				try {
					const [recipe, state] = await Promise.all([request(`/recipes/${this.id}`), request('/state')]);
					this.recipe = recipe;
					this.isFav = state.favorites.includes(this.id);
					this.isTried = state.tried.includes(this.id);
				} catch (error) { showRequestError(error); }
			},
			async onFav() {
				try {
					const active = !this.isFav;
					await request('/favorites', 'PUT', { id: this.id, active });
					this.isFav = active;
					uni.showToast({ title: active ? '已收藏' : '已取消', icon: 'none' });
				} catch (error) { showRequestError(error); }
			},
			async onTry() {
				if (!this.isTried) {
					try {
						await request('/tried', 'PUT', { id: this.id, active: true });
						this.isTried = true;
						uni.showToast({ title: '标记成功，加油！', icon: 'success' });
					} catch (error) { showRequestError(error); }
				} else {
					uni.showToast({ title: '已经标记过了', icon: 'none' });
				}
			},
			copySource() {
				if (!this.recipe?.source?.url) return;
				uni.setClipboardData({ data: this.recipe.source.url });
			},
			onShare() {
				if (!this.recipe) return;
				uni.setClipboardData({
					data: `${this.recipe.name}\n${this.recipe.ingredients.join('\n')}\n做法：\n${this.recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n出处：${this.recipe.source?.url || '未标注'}`,
					success: () => {
						uni.showToast({ title: '食谱已复制', icon: 'none' });
					}
				});
			}
		}
	};
</script>

<style>
	.page {
		min-height: 100vh;
		background: #FFF8F3;
		padding-bottom: 140rpx;
	}

	.detail {
		display: flex;
		flex-direction: column;
	}

	.hero {
		height: 360rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.hero-emoji {
		font-size: 200rpx;
		filter: drop-shadow(0 8rpx 16rpx rgba(0, 0, 0, 0.15));
	}

	.hero-overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 24rpx;
		background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.4));
	}

	.hero-name {
		font-size: 40rpx;
		font-weight: 700;
		color: #fff;
		display: block;
		text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
	}

	.hero-tags {
		margin-top: 12rpx;
		display: flex;
		gap: 10rpx;
		flex-wrap: wrap;
	}

	.hero-tag {
		font-size: 22rpx;
		padding: 4rpx 14rpx;
		border-radius: 12rpx;
		background: rgba(255, 255, 255, 0.9);
		color: #FF8A65;
	}

	.summary-card {
		margin: -32rpx 24rpx 0;
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 24rpx;
		display: flex;
		justify-content: space-around;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
		position: relative;
		z-index: 2;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
	}

	.summary-emoji {
		font-size: 36rpx;
	}

	.summary-label {
		font-size: 22rpx;
		color: #999;
	}

	.summary-value {
		font-size: 26rpx;
		color: #333;
		font-weight: 600;
	}

	.section {
		margin: 32rpx 24rpx 0;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 12rpx;
		font-size: 30rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 16rpx;
	}

	.section-emoji {
		font-size: 32rpx;
	}

	.nutrition-box {
		background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
		border-radius: 16rpx;
		padding: 24rpx;
		font-size: 26rpx;
		color: #6D4C41;
		line-height: 1.6;
	}

	.ingredients {
		background: #FFFFFF;
		border-radius: 16rpx;
		padding: 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	}

	.ingredient {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 10rpx 0;
	}

	.ingredient-dot {
		color: #FF8A65;
		font-size: 16rpx;
	}

	.ingredient-text {
		font-size: 26rpx;
		color: #555;
	}

	.steps {
		background: #FFFFFF;
		border-radius: 16rpx;
		padding: 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
	}

	.step {
		display: flex;
		gap: 16rpx;
		padding: 16rpx 0;
		border-bottom: 1rpx dashed #f0f0f0;
	}

	.step:last-child {
		border-bottom: none;
	}

	.step-num {
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		background: #FF8A65;
		color: #fff;
		text-align: center;
		line-height: 48rpx;
		font-size: 24rpx;
		font-weight: 600;
		flex-shrink: 0;
	}

	.step-text {
		flex: 1;
		font-size: 28rpx;
		color: #333;
		line-height: 1.6;
		padding-top: 6rpx;
	}

	.safety-box {
		background: #FFF7E8;
		border: 1rpx solid #FFE2A7;
		border-radius: 16rpx;
		padding: 22rpx 24rpx;
	}

	.safety-row {
		display: flex;
		align-items: flex-start;
		margin-bottom: 14rpx;
		font-size: 26rpx;
		line-height: 1.5;
	}

	.safety-label {
		color: #9A6A19;
		font-weight: 600;
		width: 126rpx;
		flex-shrink: 0;
	}

	.safety-label.warning {
		color: #D85D35;
	}

	.safety-content,
	.safety-tip {
		color: #6E5A35;
	}

	.safety-tip {
		font-size: 24rpx;
		line-height: 1.65;
		margin-top: 8rpx;
	}

	.source-box {
		background: #fff;
		border: 2rpx solid #2d2d2d;
		border-radius: 16rpx;
		padding: 24rpx;
	}

	.source-label, .source-url {
		display: block;
		font-size: 25rpx;
		line-height: 1.5;
		color: #2d2d2d;
	}

	.source-url {
		margin-top: 10rpx;
		color: #5f5b55;
		word-break: break-all;
	}

	.source-copy {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 88rpx;
		margin-top: 16rpx;
		border: 2rpx solid #2d2d2d;
		border-radius: 12rpx;
		background: #fff9c4;
		font-size: 26rpx;
		font-weight: 600;
		color: #2d2d2d;
	}

	.footer-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background: #FFFFFF;
		display: flex;
		padding: 16rpx 0;
		border-top: 1rpx solid #f0f0f0;
		box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
	}

	.footer-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4rpx;
		font-size: 32rpx;
	}

	.footer-btn-text {
		font-size: 22rpx;
		color: #666;
	}

	.empty {
		padding: 200rpx 0;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20rpx;
	}

	.empty-emoji {
		font-size: 120rpx;
		color: #999;
	}

	/* 手帐纸张主题覆盖 */
	.page { background: transparent; }
	.hero { margin: 24rpx 24rpx 0; height: 330rpx; border: 3rpx solid #2d2d2d; border-radius: 38rpx 16rpx 32rpx 20rpx; box-shadow: 7rpx 7rpx 0 #2d2d2d; overflow: hidden; transform: rotate(-0.35deg); }
	.hero-overlay { background: linear-gradient(180deg, transparent, rgba(45,45,45,.78)); }
	.hero-name { font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; text-shadow: none; }
	.hero-tag { color: #2d2d2d; border: 1rpx solid #2d2d2d; border-radius: 12rpx 5rpx 12rpx 6rpx; }
	.summary-card { border: 3rpx solid #2d2d2d; border-radius: 22rpx 10rpx 24rpx 12rpx; box-shadow: 5rpx 5rpx 0 #2d2d2d; background: #fff9c4; }
	.summary-value, .section-title { color: #2d2d2d; font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; font-weight: 700; }
	.section-title::after { content: ""; height: 6rpx; flex: 1; border-top: 2rpx dashed #2d2d2d; margin-left: 10rpx; }
	.nutrition-box, .safety-box { border: 3rpx solid #2d2d2d; border-radius: 20rpx 8rpx 18rpx 10rpx; box-shadow: 4rpx 4rpx 0 #2d2d2d; background: #fff9c4; color: #2d2d2d; }
	.ingredients, .steps { border: 3rpx solid #2d2d2d; border-radius: 22rpx 10rpx 20rpx 12rpx; box-shadow: 5rpx 5rpx 0 #2d2d2d; background: #fff; }
	.ingredient-dot, .safety-label.warning { color: #ff4d4d; }
	.step { border-bottom: 2rpx dashed #2d2d2d; }
	.step-num { background: #ff4d4d; border: 2rpx solid #2d2d2d; box-shadow: 2rpx 2rpx 0 #2d2d2d; }
	.safety-content, .safety-tip, .safety-label { color: #2d2d2d; }
	.footer-bar { background: #fdfbf7; border-top: 3rpx solid #2d2d2d; box-shadow: 0 -4rpx 0 rgba(45,45,45,.15); }
	.footer-btn { min-height: 80rpx; color: #2d2d2d; }
	.footer-btn-text { color: #2d2d2d; font-weight: 700; }

</style>
