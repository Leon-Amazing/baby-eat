<template>
	<view class="page">
		<!-- 顶部 -->
		<view class="header">
			<view class="header-info">
				<text class="header-title">我的菜单</text>
				<text class="header-sub">共 {{ menuList.length }} 道，{{ categorySummary() }}</text>
			</view>
			<view class="add-btn" @tap="openAdd">
				<text>＋ 添加</text>
			</view>
		</view>

		<!-- 筛选标签 -->
		<scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
			<view class="filter-row">
				<view class="filter-tag" :class="{ active: filterCategory === '' }" @tap="setFilter('')">全部</view>
				<view class="filter-tag" v-for="c in categories()" :key="c.value" :class="{ active: filterCategory === c.value }" @tap="setFilter(c.value)">
					<text>{{ c.emoji }}</text>{{ c.label }}
				</view>
			</view>
		</scroll-view>

		<!-- 列表 -->
		<view v-if="filteredList().length" class="menu-list">
			<view class="menu-card" v-for="item in filteredList()" :key="item.id">
				<view class="menu-card-header">
					<view class="menu-thumb" :style="{ background: item.color || '#FFB74D' }">
						<text class="menu-emoji">{{ item.emoji || '🍳' }}</text>
					</view>
					<view class="menu-meta">
						<view class="menu-name-row">
							<text class="menu-name">{{ item.name }}</text>
							<text class="menu-cat-badge">{{ categoryLabelOf(item.category) }}</text>
						</view>
						<text class="menu-time">添加于 {{ item.createdAt }}</text>
					</view>
				</view>

				<view class="menu-section" v-if="item.ingredients && item.ingredients.length">
					<text class="section-label">食材</text>
					<view class="ingredients">
						<text class="ingredient" v-for="(ing, idx) in item.ingredients" :key="idx">{{ ing }}</text>
					</view>
				</view>

				<view class="menu-section" v-if="item.steps && item.steps.length">
					<text class="section-label">做法</text>
					<view class="steps">
						<view class="step" v-for="(s, idx) in item.steps" :key="idx">
							<text class="step-num">{{ idx + 1 }}</text>
							<text class="step-text">{{ s }}</text>
						</view>
					</view>
				</view>

				<view class="menu-actions">
					<view class="action-btn edit" @tap="openEdit(item)">编辑</view>
					<view class="action-btn try" @tap="markTried(item)">{{ triedMenu.includes(item.id) ? '已做 ✓' : '标记已做' }}</view>
					<view class="action-btn del" @tap="onDelete(item)">删除</view>
				</view>
			</view>
		</view>

		<view v-else class="empty">
			<text class="empty-emoji">📒</text>
			<text class="empty-text">{{ menuList.length ? '该分类下还没有菜单' : '还没有添加过自己的菜单' }}</text>
			<view class="empty-add-btn" @tap="openAdd">去添加</view>
		</view>

		<!-- 添加/编辑弹窗 -->
		<view class="modal-mask" v-if="showModal" @tap="closeModal">
			<view class="modal" @tap.stop>
				<view class="modal-title">{{ editingId ? '编辑菜单' : '添加菜单' }}</view>
				<scroll-view scroll-y class="modal-body">
					<view class="form-row">
						<text class="form-label">菜单名称</text>
						<input class="form-input" v-model="form.name" placeholder="例：妈妈牌南瓜粥" maxlength="20" />
					</view>

					<view class="form-row">
						<text class="form-label">餐次</text>
						<view class="cat-picker">
							<view class="cat-pill" v-for="c in categories()" :key="c.value" :class="{ active: form.category === c.value }" @tap="form.category = c.value">
								<text>{{ c.emoji }}</text>{{ c.label }}
							</view>
						</view>
					</view>

					<view class="form-row">
						<text class="form-label">图案（可选）</text>
						<view class="emoji-row">
							<view class="emoji-cell" v-for="em in emojiChoices" :key="em" :class="{ active: form.emoji === em }" @tap="form.emoji = em">
								<text class="emoji-glyph">{{ em }}</text>
							</view>
						</view>
						<view class="color-row">
							<view class="color-cell" v-for="c in colorChoices" :key="c" :style="{ background: c }" :class="{ active: form.color === c }" @tap="form.color = c"></view>
						</view>
					</view>

					<view class="form-row">
						<text class="form-label">食材（每行一项）</text>
						<textarea class="form-textarea" v-model="form.ingredientsText" placeholder="南瓜 50g&#10;米粉 20g" maxlength="400" />
					</view>

					<view class="form-row">
						<text class="form-label">做法（每行一步）</text>
						<textarea class="form-textarea" v-model="form.stepsText" placeholder="南瓜切块蒸熟&#10;打成泥拌入米粉" maxlength="600" />
					</view>
				</scroll-view>

				<view class="modal-footer">
					<view class="modal-btn cancel" @tap="closeModal">取消</view>
					<view class="modal-btn confirm" @tap="onSave">保存</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { request, showRequestError } from '@/utils/api.js';
	import { CATEGORY_LABELS, CATEGORY_LIST } from '@/utils/recipes-data.js';

	export default {
		data() {
			return {
				menuList: [],
				triedMenu: [],
				filterCategory: '',
				showModal: false,
				editingId: null,
				form: this.emptyForm(),
				emojiChoices: ['🍳', '🍜', '🥣', '🍚', '🥘', '🍲', '🥗', '🍰', '🥟', '🥪'],
				colorChoices: ['#FFB74D', '#FF8A65', '#F06292', '#7986CB', '#4DB6AC', '#81C784', '#FFD54F', '#A1887F']
			};
		},
		onShow() {
			this.refresh();
		},
		methods: {
			categories() {
				return CATEGORY_LIST;
			},
			filteredList() {
				if (!this.filterCategory) return this.menuList;
				return this.menuList.filter(m => m.category === this.filterCategory);
			},
			categorySummary() {
				if (!this.menuList.length) return '加油添加吧';
				const map = {};
				this.menuList.forEach(m => {
					map[m.category] = (map[m.category] || 0) + 1;
				});
				return Object.keys(map).map(k => `${CATEGORY_LABELS[k]}${map[k]}`).join(' · ');
			},
			async refresh() {
				try {
					const state = await request('/state');
					this.menuList = state.menu;
					this.triedMenu = state.triedMenu || [];
				} catch (error) { showRequestError(error); }
			},
			emptyForm() {
				return {
					name: '',
					category: 'lunch',
					emoji: '🍳',
					color: '#FFB74D',
					ingredientsText: '',
					stepsText: ''
				};
			},
			setFilter(v) {
				this.filterCategory = v;
			},
			categoryLabelOf(c) {
				return CATEGORY_LABELS[c] || c;
			},
			openAdd() {
				this.editingId = null;
				this.form = this.emptyForm();
				this.showModal = true;
			},
			openEdit(item) {
				this.editingId = item.id;
				this.form = {
					name: item.name,
					category: item.category,
					emoji: item.emoji || '🍳',
					color: item.color || '#FFB74D',
					ingredientsText: (item.ingredients || []).join('\n'),
					stepsText: (item.steps || []).join('\n')
				};
				this.showModal = true;
			},
			closeModal() {
				this.showModal = false;
			},
			async onSave() {
				const name = (this.form.name || '').trim();
				if (!name) {
					uni.showToast({ title: '请输入菜单名称', icon: 'none' });
					return;
				}
				const ingredients = this.form.ingredientsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
				const steps = this.form.stepsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

				try {
					const payload = { name, category: this.form.category, emoji: this.form.emoji, color: this.form.color, ingredients, steps };
					await request(this.editingId ? `/menu/${this.editingId}` : '/menu', this.editingId ? 'PUT' : 'POST', payload);
					await this.refresh();
					this.showModal = false;
					uni.showToast({ title: '已保存', icon: 'success' });
				} catch (error) { showRequestError(error); }
			},
			onDelete(item) {
				uni.showModal({
					title: '删除菜单',
					content: `确定删除「${item.name}」吗？`,
					confirmText: '删除',
					confirmColor: '#dd524d',
					success: async (r) => {
						if (r.confirm) {
							try {
							await request(`/menu/${item.id}`, 'DELETE');
							await this.refresh();
							uni.showToast({ title: '已删除', icon: 'none' });
							} catch (error) { showRequestError(error); }
						}
					}
				});
			},
			async markTried(item) {
				try {
					const active = !this.triedMenu.includes(item.id);
					this.triedMenu = await request('/tried-menu', 'PUT', { id: item.id, active });
					uni.showToast({ title: active ? '已标记完成' : '已取消标记', icon: 'none' });
				} catch (error) { showRequestError(error); }
			},
			formatDate(d) {
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				return `${y}-${m}-${day}`;
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

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 20rpx 24rpx;
		margin-bottom: 20rpx;
	}

	.header-title {
		font-size: 36rpx;
		font-weight: 600;
		color: #333;
		display: block;
	}

	.header-sub {
		font-size: 22rpx;
		color: #999;
		margin-top: 6rpx;
		display: block;
	}

	.add-btn {
		background: #FF8A65;
		color: #fff;
		font-size: 26rpx;
		padding: 14rpx 32rpx;
		border-radius: 32rpx;
		box-shadow: 0 6rpx 16rpx rgba(255, 138, 101, 0.4);
	}

	.filter-scroll {
		white-space: nowrap;
		margin-bottom: 24rpx;
	}

	.filter-row {
		display: inline-flex;
		gap: 12rpx;
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

	.menu-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.menu-card {
		background: #FFFFFF;
		border-radius: 20rpx;
		padding: 24rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	}

	.menu-card-header {
		display: flex;
		gap: 20rpx;
		align-items: center;
	}

	.menu-thumb {
		width: 100rpx;
		height: 100rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.menu-emoji {
		font-size: 56rpx;
	}

	.menu-meta {
		flex: 1;
	}

	.menu-name-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8rpx;
	}

	.menu-name {
		font-size: 30rpx;
		font-weight: 600;
		color: #333;
	}

	.menu-cat-badge {
		font-size: 20rpx;
		color: #FF8A65;
		background: #FFE0D6;
		padding: 2rpx 12rpx;
		border-radius: 10rpx;
	}

	.menu-time {
		font-size: 22rpx;
		color: #999;
		margin-top: 6rpx;
		display: block;
	}

	.menu-section {
		margin-top: 20rpx;
	}

	.section-label {
		font-size: 24rpx;
		color: #FF8A65;
		font-weight: 600;
		margin-bottom: 10rpx;
		display: block;
	}

	.ingredients {
		display: flex;
		flex-wrap: wrap;
		gap: 10rpx;
	}

	.ingredient {
		font-size: 22rpx;
		background: #FFF3E0;
		color: #6D4C41;
		padding: 6rpx 14rpx;
		border-radius: 10rpx;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 10rpx;
	}

	.step {
		display: flex;
		gap: 12rpx;
		font-size: 24rpx;
		color: #555;
		line-height: 1.6;
	}

	.step-num {
		width: 32rpx;
		height: 32rpx;
		border-radius: 50%;
		background: #FF8A65;
		color: #fff;
		text-align: center;
		line-height: 32rpx;
		font-size: 20rpx;
		flex-shrink: 0;
	}

	.step-text {
		flex: 1;
	}

	.menu-actions {
		margin-top: 20rpx;
		display: flex;
		justify-content: flex-end;
		gap: 16rpx;
		border-top: 1rpx solid #f0f0f0;
		padding-top: 16rpx;
	}

	.action-btn {
		font-size: 24rpx;
		padding: 8rpx 24rpx;
		border-radius: 24rpx;
		background: #FAFAFA;
		color: #666;
	}

	.action-btn.edit {
		color: #FF8A65;
		background: #FFF0E6;
	}

	.action-btn.try {
		color: #4CAF50;
		background: #E8F5E9;
	}

	.action-btn.del {
		color: #dd524d;
		background: #FFEBEE;
	}

	.empty {
		padding: 120rpx 0;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16rpx;
	}

	.empty-emoji {
		font-size: 100rpx;
	}

	.empty-text {
		font-size: 26rpx;
		color: #999;
	}

	.empty-add-btn {
		margin-top: 16rpx;
		padding: 12rpx 36rpx;
		background: #FF8A65;
		color: #fff;
		font-size: 26rpx;
		border-radius: 32rpx;
	}

	/* 弹窗 */
	.modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-end;
		z-index: 1000;
	}

	.modal {
		background: #fff;
		border-top-left-radius: 28rpx;
		border-top-right-radius: 28rpx;
		width: 100%;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: 600;
		text-align: center;
		padding: 24rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.modal-body {
		flex: 1;
		padding: 24rpx;
		overflow-y: auto;
	}

	.form-row {
		margin-bottom: 24rpx;
	}

	.form-label {
		font-size: 26rpx;
		color: #666;
		margin-bottom: 12rpx;
		display: block;
	}

	.form-input {
		background: #F8F8F8;
		border-radius: 12rpx;
		padding: 16rpx 20rpx;
		font-size: 28rpx;
	}

	.form-textarea {
		background: #F8F8F8;
		border-radius: 12rpx;
		padding: 16rpx 20rpx;
		font-size: 26rpx;
		width: 100%;
		min-height: 140rpx;
		box-sizing: border-box;
	}

	.cat-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.cat-pill {
		padding: 10rpx 24rpx;
		background: #F8F8F8;
		border-radius: 30rpx;
		font-size: 24rpx;
		color: #666;
		display: flex;
		align-items: center;
		gap: 6rpx;
	}

	.cat-pill.active {
		background: #FF8A65;
		color: #fff;
	}

	.emoji-row {
		display: flex;
		flex-wrap: wrap;
		width: 100%;
		gap: 12rpx;
	}

	.emoji-cell {
		flex: 0 0 18%;
		min-width: 0;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #F8F8F8;
		border-radius: 12rpx;
	}

	.emoji-glyph {
		display: block;
		font-size: 42rpx;
		line-height: 1.4;
		text-align: center;
	}

	.emoji-cell.active {
		background: #FFE0D6;
		box-shadow: inset 0 0 0 3rpx #ff4d4d;
	}

	.color-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 12rpx;
	}

	.color-cell {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
	}

	.color-cell.active {
		box-shadow: 0 0 0 4rpx #FF8A65, 0 0 0 8rpx #fff inset;
		transform: scale(1.1);
	}

	.modal-footer {
		display: flex;
		border-top: 1rpx solid #f0f0f0;
	}

	.modal-btn {
		flex: 1;
		text-align: center;
		padding: 24rpx 0;
		font-size: 28rpx;
	}

	.modal-btn.cancel {
		color: #999;
		border-right: 1rpx solid #f0f0f0;
	}

	.modal-btn.confirm {
		color: #FF8A65;
		font-weight: 600;
	}

	/* 手帐纸张主题覆盖 */
	.page { background: transparent; padding: 28rpx 28rpx 60rpx; }
	.header { background: #fff9c4; border: 3rpx solid #2d2d2d; border-radius: 36rpx 16rpx 28rpx 20rpx; box-shadow: 7rpx 7rpx 0 #2d2d2d; transform: rotate(-0.35deg); }
	.header-title, .menu-name, .modal-title { color: #2d2d2d; font-family: "Kaiti SC", "STKaiti", "KaiTi", serif; font-weight: 700; }
	.add-btn, .empty-add-btn { background: #ff4d4d; border: 3rpx solid #2d2d2d; border-radius: 20rpx 8rpx 18rpx 10rpx; box-shadow: 4rpx 4rpx 0 #2d2d2d; color: #fff; }
	.filter-tag, .cat-pill { background: #fff; border: 2rpx solid #2d2d2d; border-radius: 16rpx 8rpx 18rpx 9rpx; color: #2d2d2d; }
	.filter-tag.active, .cat-pill.active { background: #ff4d4d; border-color: #2d2d2d; color: #fff; box-shadow: 3rpx 3rpx 0 #2d2d2d; }
	.menu-card { background: #fff; border: 3rpx solid #2d2d2d; border-radius: 30rpx 14rpx 26rpx 16rpx; box-shadow: 6rpx 6rpx 0 #2d2d2d; }
	.menu-card:nth-child(even) { transform: rotate(0.35deg); }
	.menu-thumb { border: 2rpx solid #2d2d2d; border-radius: 20rpx 10rpx 22rpx 12rpx; }
	.menu-cat-badge, .section-label { background: #fff9c4; color: #2d2d2d; border: 1rpx solid #2d2d2d; border-radius: 10rpx 5rpx 12rpx 6rpx; }
	.ingredients, .steps { border: 2rpx dashed #2d2d2d; border-radius: 18rpx 8rpx 16rpx 10rpx; background: #fdfbf7; }
	.action-btn { border: 2rpx solid #2d2d2d; border-radius: 14rpx 7rpx 14rpx 8rpx; box-shadow: 2rpx 2rpx 0 #2d2d2d; }
	.modal { border: 3rpx solid #2d2d2d; border-bottom: 0; border-radius: 32rpx 18rpx 0 0; background: #fdfbf7; }
	.form-input, .form-textarea { background: #fff; border: 2rpx solid #2d2d2d; border-radius: 16rpx 8rpx 14rpx 10rpx; }
	.emoji-cell, .color-cell { border: 2rpx solid #2d2d2d; border-radius: 14rpx 7rpx 16rpx 8rpx; }
	.modal-btn.confirm { color: #ff4d4d; font-weight: 700; }

</style>
