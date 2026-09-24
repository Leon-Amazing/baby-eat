<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	page {
		background-color: #fdfbf7;
		background-image: radial-gradient(#e5e0d8 1rpx, transparent 1rpx);
		background-size: 24rpx 24rpx;
		color: #2d2d2d;
		font-family: "Kaiti SC", "STKaiti", "KaiTi", "FZKai-Z03", "PingFang SC", sans-serif;
		font-size: 28rpx;
	}

	/* 全局滚动条样式 */
	view, text {
		box-sizing: border-box;
	}

	/* 移除按钮默认样式 */
	button {
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		line-height: normal;
	}

	button::after {
		border: none;
	}

	/* 手帐风格的通用交互反馈 */
	button:active, view[hover-class]:active {
		transform: translate(2rpx, 2rpx);
	}
</style>
