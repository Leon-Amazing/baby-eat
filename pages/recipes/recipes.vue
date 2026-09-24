<template>
	<view class="page">
		<!-- 搜索框 -->
		<view class="search-bar">
			<view class="search-input-wrap">
				<text class="search-icon">🔍</text>
				<input class="search-input" type="text" v-model="keyword" placeholder="搜索食谱名/食材/标签" confirm-type="search" @confirm="onSearch" />
				<text v-if="keyword" class="search-clear" @tap="clearKeyword">✕</text>
			</view>
		</view>

		<!-- 筛选条件 -->
		<view class="filter-bar">
			<scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
				<view class="filter-row">
					<view class="filter-tag" :class="{ active: filter.category === '' }" @tap="setCategory('')">全部</view>
					<view class="filter-tag" v-for="c in categories()" :key="c.value" :class="{ active: filter.category === c.value }" @tap="setCategory(c.value)">
						<text class="filter-emoji">{{ c.emoji }}</text>{{ c.label }}
					</view>
				</view>
			</scroll-view>

			<scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
				<view class="filter-row">
					<view class="filter-tag" :class="{ active: !autoStageValue() && filter.stage === '' }" @tap="setStage('')">全部月龄</view>
					<view class="filter-tag" v-for="s in stages()" :key="s.value" :class="{ active: autoStageValue() === s.value || (!autoStageValue() && filter.stage === s.value) }" @tap="setStage(s.value)">{{ s.label }}</view>
				</view>
			</scroll-view>

			<view class="filter-summary" v-if="baby.birthday">
				<text class="summary-text">宝宝阶段：{{ babyStageLabel() }}{{ autoStage ? '（已自动筛选该月龄）' : '（未启用自动筛选）' }}</text>
				<text class="summary-action" @tap="toggleAutoStage">{{ autoStage ? '取消自动' : '启用自动' }}</text>
			</view>
		</view>

		<!-- 排序与统计 -->
		<view class="list-header">
			<text class="list-count">共 {{ filteredList().length }} 个食谱</text>
			<view class="sort-btn" @tap="cycleSort">
				<text>{{ sortLabel() }} ⇅</text>
			</view>
		</view>

		<!-- 食谱列表 -->
		<view v-if="filteredList().length" class="recipe-list">
			<view class="recipe-card" v-for="r in filteredList()" :key="r.id" @tap="openDetail(r)">
				<view class="recipe-thumb" :style="{ background: r.color }">
					<text class="recipe-emoji">{{ r.emoji }}</text>
				</view>
				<view class="recipe-detail">
					<view class="recipe-name-row">
						<text class="recipe-name">{{ r.name }}</text>
						<text class="recipe-stage-badge">{{ stageLabelOf(r.stage) }}</text>
					</view>
					<text class="recipe-cat">{{ categoryLabelOf(r.category) }} · ⏱️{{ r.cookTime }} 分钟</text>
					<view class="recipe-tags">
						<text class="tag" v-for="t in r.tags" :key="t">{{ t }}</text>
					</view>
				</view>
				<view class="fav-btn" @tap.stop="onFav(r)">
					<text :class="{ 'fav-active': isFav(r.id) }">{{ isFav(r.id) ? '❤️' : '🤍' }}</text>
				</view>
			</view>
		</view>

		<view v-else class="empty">
			<text class="empty-emoji">🍽️</text>
			<text class="empty-text">{{ autoStageValue() === 'pre' ? '宝宝未满 6 个月，暂不推荐辅食食谱' : '没有匹配的食谱，换个筛选试试' }}</text>
		</view>
	</view>
</template>

<script>
	import { CATEGORY_LABELS, CATEGORY_LIST } from '@/utils/recipes-data.js';
	import { STAGE_LABELS, STAGE_ORDER, getMonthAge, getStage } from '@/utils/baby.js';
	import { request, showRequestError } from '@/utils/api.js';

	export default {
		data() {
			return {
				keyword: '',
				filter: { category: '', stage: '' },
				sortMode: 0, // 0 默认，1 时间升序，2 时间降序
				autoStage: true,
				baby: { birthday: '', nickname: '' },
				recipes: [],
				favorites: []
			};
		},
		onShow() {
			this.refresh();
		},
		methods: {
			categories() {
				return CATEGORY_LIST;
			},
			stages() {
				return STAGE_ORDER.filter(s => s !== 'pre').map(s => ({ value: s, label: STAGE_LABELS[s] }));
			},
			babyStageLabel() {
				if (!this.baby.birthday) return '未设置';
				return STAGE_LABELS[getStage(getMonthAge(this.baby.birthday))];
			},
			autoStageValue() {
				if (!this.autoStage || !this.baby.birthday) return '';
				return getStage(getMonthAge(this.baby.birthday));
			},
			sortLabel() {
				return ['默认排序', '时间⬆', '时间⬇'][this.sortMode];
			},
			filteredList() {
				let list = this.recipes.slice();
				// 关键词
				const kw = this.keyword.trim();
				if (kw) {
					list = list.filter(r =>
						r.name.includes(kw) ||
						r.tags.some(t => t.includes(kw)) ||
						r.ingredients.some(i => i.includes(kw))
					);
				}
				// 分类
				if (this.filter.category) {
					list = list.filter(r => r.category === this.filter.category);
				}
				// 自动和手动月龄筛选都只显示对应月龄组的食谱。
				const autoStage = this.autoStageValue();
				if (autoStage) {
					list = list.filter(r => r.stage === autoStage);
				} else if (this.filter.stage) {
					list = list.filter(r => r.stage === this.filter.stage);
				}
				// 排序
				if (this.sortMode === 1) {
					list.sort((a, b) => a.cookTime - b.cookTime);
				} else if (this.sortMode === 2) {
					list.sort((a, b) => b.cookTime - a.cookTime);
				}
				return list;
			},
			async refresh() {
				try {
					const [recipes, state] = await Promise.all([request('/recipes'), request('/state')]);
					this.recipes = recipes;
					this.baby = state.baby;
					this.favorites = state.favorites;
				} catch (error) { showRequestError(error); }
			},
			setCategory(v) {
				this.filter.category = v;
			},
			setStage(v) {
				this.filter.stage = v;
				this.autoStage = false;
			},
			toggleAutoStage() {
				this.autoStage = !this.autoStage;
			},
			cycleSort() {
				this.sortMode = (this.sortMode + 1) % 3;
			},
			clearKeyword() {
				this.keyword = '';
			},
			onSearch() {
				// 即时筛选，无需额外动作
			},
			isFav(id) {
				return this.favorites.includes(id);
			},
			async onFav(r) {
				try {
					const active = !this.isFav(r.id);
					this.favorites = await request('/favorites', 'PUT', { id: r.id, active });
					uni.showToast({ title: active ? '已收藏' : '已取消收藏', icon: 'none' });
				} catch (error) { showRequestError(error); }
			},
			stageLabelOf(s) {
				return STAGE_LABELS[s];
			},
			categoryLabelOf(c) {
				return CATEGORY_LABELS[c];
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
		padding: 24rpx 24rpx 48rpx;
		box-sizing: border-box;
	}

	.search-bar {
		margin-bottom: 16rpx;
	}

	.search-input-wrap {
		background: #FFFFFF;
		border-radius: 40rpx;
		padding: 16rpx 28rpx;
		display: flex;
		align-items: center;
		box-shadow: 0 4rpx 16rpx rgba(255, 138, 101, 0.08);
	}

	.search-icon {
		font-size: 28rpx;
		margin-right: 16rpx;
	}

	.search-input {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}

	.search-clear {
		font-size: 28rpx;
		color: #ccc;
		padding: 0 8rpx;
	}

	.filter-bar {
		margin-bottom: 16rpx;
	}

	.filter-scroll {
		white-space: nowrap;
		margin-bottom: 12rpx;
	}

	.filter-row {
		display: inline-flex;
		gap: 12rpx;
		padding: 4rpx 0;
	}

	.filter-tag {
		display: inline-flex;
		align-items: center;
		gap: 6rpx;
		padding: 10rpx 24rpx;
		background: #FFFFFF;
		color: #666;
		font-size: 24rpx;
		border-radius: 30rpx;
		border: 1rpx solid #FFE0D6;
	}

	.filter-tag.active {
		background: #FF8A65;
		color: #fff;
		border-color: #FF8A65;
	}

	.filter-emoji {
		font-size: 24rpx;
	}

	.filter-summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12rpx 16rpx;
		font-size: 22rpx;
		color: #999;
		background: #FFF0E6;
		border-radius: 12rpx;
		margin-top: 8rpx;
	}

	.summary-action {
		color: #FF8A65;
	}

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16rpx 8rpx;
		margin-bottom: 12rpx;
	}

	.list-count {
		font-size: 26rpx;
		color: #666;
	}

	.sort-btn {
		font-size: 24rpx;
		color: #FF8A65;
		padding: 6rpx 20rpx;
		background: #FFF0E6;
		border-radius: 24rpx;
	}

	.recipe-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.recipe-card {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 20rpx;
		display: flex;
		gap: 20rpx;
		align-items: center;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	}

	.recipe-thumb {
		width: 140rpx;
		height: 140rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.recipe-emoji {
		font-size: 80rpx;
	}

	.recipe-detail {
		flex: 1;
		min-width: 0;
	}

	.recipe-name-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8rpx;
	}

	.recipe-name {
		font-size: 30rpx;
		font-weight: 600;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.recipe-stage-badge {
		font-size: 20rpx;
		color: #FF8A65;
		background: #FFE0D6;
		padding: 2rpx 12rpx;
		border-radius: 10rpx;
		flex-shrink: 0;
	}

	.recipe-cat {
		font-size: 22rpx;
		color: #999;
		margin-top: 6rpx;
		display: block;
	}

	.recipe-tags {
		margin-top: 10rpx;
		display: flex;
		gap: 8rpx;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 20rpx;
		padding: 2rpx 12rpx;
		border-radius: 10rpx;
		background: #FFF3E0;
		color: #FB8C00;
	}

	.fav-btn {
		font-size: 40rpx;
		padding: 8rpx;
		flex-shrink: 0;
	}

	.fav-active {
		animation: pop 0.3s;
	}

	@keyframes pop {
		0% { transform: scale(1); }
		50% { transform: scale(1.4); }
		100% { transform: scale(1); }
	}

	.empty {
		padding: 120rpx 0;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20rpx;
	}

	.empty-emoji {
		font-size: 100rpx;
	}

	.empty-text {
		font-size: 26rpx;
		color: #999;
	}

	/* 手帐纸张主题覆盖 */
	.page { background: transparent; padding: 28rpx 28rpx 56rpx; }
	.search-input-wrap { background: #fff; border: 3rpx solid #2d2d2d; border-radius: 32rpx 18rpx 28rpx 16rpx; box-shadow: 5rpx 5rpx 0 #2d2d2d; }
	.search-input { color: #2d2d2d; font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; }
	.filter-tag { border: 2rpx solid #2d2d2d; border-radius: 18rpx 8rpx 16rpx 10rpx; background: #fff; color: #2d2d2d; }
	.filter-tag.active { background: #ff4d4d; border-color: #2d2d2d; color: #fff; box-shadow: 3rpx 3rpx 0 #2d2d2d; }
	.filter-summary { background: #fff9c4; color: #2d2d2d; border: 2rpx dashed #2d2d2d; border-radius: 12rpx 22rpx 14rpx 18rpx; }
	.summary-action, .sort-btn { color: #2d5da1; font-weight: 700; }
	.list-count { color: #2d2d2d; font-weight: 700; }
	.sort-btn { border: 2rpx solid #2d2d2d; background: #fff; border-radius: 14rpx 8rpx 16rpx 8rpx; box-shadow: 3rpx 3rpx 0 #2d2d2d; }
	.recipe-card { border: 3rpx solid #2d2d2d; border-radius: 30rpx 14rpx 26rpx 16rpx / 16rpx 28rpx 14rpx 30rpx; box-shadow: 6rpx 6rpx 0 #2d2d2d; background: #fff; }
	.recipe-card:nth-child(even) { transform: rotate(0.35deg); }
	.recipe-thumb { border: 2rpx solid #2d2d2d; border-radius: 22rpx 12rpx 24rpx 10rpx; }
	.recipe-name { color: #2d2d2d; font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; font-weight: 700; }
	.recipe-stage-badge, .tag { border: 1rpx solid #2d2d2d; border-radius: 12rpx 5rpx 12rpx 6rpx; background: #fff9c4; color: #2d2d2d; }
	.recipe-cat { color: #5f5b55; }
	.fav-btn { min-width: 64rpx; min-height: 64rpx; display: flex; align-items: center; justify-content: center; }

</style>
