// 创建裁剪边界
export function createCropperBoundary() {
	return {
		// 裁剪区域状态
		cropBox: {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		},

		// 更新裁剪区域
		updateCropBox(x: number, y: number, width: number, height: number) {
			this.cropBox = { x, y, width, height }
			return this.cropBox
		},

		// 获取裁剪结果
		getCropResult() {
			return this.cropBox
		},

		// 重置裁剪区域
		reset() {
			this.cropBox = { x: 0, y: 0, width: 0, height: 0 }
		},
	}
}
