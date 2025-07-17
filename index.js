//@ts-check
/** @return {{canvas:HTMLCanvasElement,gridCanvas:HTMLCanvasElement,preview1x:HTMLCanvasElement,preview2x:HTMLCanvasElement,resolutionSelect:HTMLSelectElement,gridToggle:HTMLInputElement,clearButton:HTMLButtonElement,dp:HTMLDivElement,fileInput:HTMLInputElement,openImage:HTMLButtonElement}} */
function getElements() {
	const resolutionSelect = document.getElementById("resolution-select");
	const canvas = document.getElementById("pixel-canvas");
	const gridCanvas = document.getElementById("grid-canvas");
	const preview1x = document.getElementById("preview-1x");
	const preview2x = document.getElementById("preview-2x");
	const gridToggle = document.getElementById("grid-toggle");
	const clearButton = document.getElementById("clear-button");
	const dp = document.getElementById("draw-preview");
	const fileInput = document.getElementById("file-input");
	const openImage = document.getElementById("open-image");
	if (
		!(
			canvas instanceof HTMLCanvasElement &&
			gridCanvas instanceof HTMLCanvasElement &&
			preview1x instanceof HTMLCanvasElement &&
			preview2x instanceof HTMLCanvasElement &&
			resolutionSelect instanceof HTMLSelectElement &&
			gridToggle instanceof HTMLInputElement &&
			clearButton instanceof HTMLButtonElement &&
			dp instanceof HTMLDivElement &&
			fileInput instanceof HTMLInputElement &&
			openImage instanceof HTMLButtonElement
		)
	) {
		alert("要素の取得に失敗");
		throw new Error("elements not found");
	}
	return {
		canvas,
		gridCanvas,
		preview1x,
		preview2x,
		resolutionSelect,
		gridToggle,
		clearButton,
		dp,
		fileInput,
		openImage,
	};
}
const {
	canvas,
	gridCanvas,
	preview1x,
	preview2x,
	resolutionSelect,
	gridToggle,
	clearButton,
	dp,
	fileInput,
	openImage,
} = getElements();
function getCanvasContext() {
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	const gridCtx = gridCanvas.getContext("2d", { willReadFrequently: true });
	const ctx1x = preview1x.getContext("2d", { willReadFrequently: true });
	const ctx2x = preview2x.getContext("2d", { willReadFrequently: true });
	if (ctx && gridCtx && ctx1x && ctx2x) {
		return { ctx, gridCtx, ctx1x, ctx2x };
	} else {
		alert("キャンバス文脈の取得に失敗しました");
		throw new Error("cant get canvas context");
	}
}
const { ctx, gridCtx, ctx1x, ctx2x } = getCanvasContext();

const params = new URLSearchParams(globalThis.location.search);
const dataParam = params.get("data");
const ZOOM = 16;

let isGridEnabled = true;

function updatePreviews() {
	preview1x.width = canvas.width;
	preview1x.height = canvas.height;
	ctx1x.drawImage(canvas, 0, 0);

	preview2x.width = canvas.width * 2;
	preview2x.height = canvas.height * 2;
	ctx1x.imageSmoothingEnabled = false;
	ctx2x.imageSmoothingEnabled = false;
	ctx2x.drawImage(
		canvas,
		0,
		0,
		canvas.width,
		canvas.height,
		0,
		0,
		canvas.width * 2,
		canvas.height * 2,
	);
}

function drawGrid() {
	const width = canvas.width;
	const height = canvas.height;
	const displayWidth = width * ZOOM;
	const displayHeight = height * ZOOM;
	gridCanvas.width = displayWidth;
	gridCanvas.height = displayHeight;
	gridCtx.clearRect(0, 0, displayWidth, displayHeight);

	gridCtx.strokeStyle = "rgba(128, 122, 128, 0.5)";
	gridCtx.lineWidth = 1;

	for (let i = 0; i <= width; i++) {
		gridCtx.beginPath();
		gridCtx.moveTo(i * ZOOM - 0.5, 0);
		gridCtx.lineTo(i * ZOOM - 0.5, displayHeight);
		gridCtx.stroke();
	}

	for (let i = 0; i <= height; i++) {
		gridCtx.beginPath();
		gridCtx.moveTo(0, i * ZOOM - 0.5);
		gridCtx.lineTo(displayWidth, i * ZOOM - 0.5);
		gridCtx.stroke();
	}
}

/**
 * @param {boolean} [reload]
 */
function updateUrlWithCanvasData(reload) {
	try {
		const dataURL = imgdata();
		const newUrl = `${globalThis.location.pathname}?data=${encodeURIComponent(
			dataURL,
		)}`;
		if (reload) {
			location.href = newUrl;
		} else {
			history.replaceState({ path: newUrl }, "", newUrl);
		}
	} catch (e) {
		console.error("URLの更新に失敗しました。", e);
	}
}

/**
 *
 * @param {number} width_
 * @param {number} height_
 * @param {boolean} [keepURL]
 */
function createNewCanvas(width_, height_, keepURL) {
	let width = width_;
	let height = height_;
	if (width > 96) {
		height = height / (width / 96);
		width = 96;
	}
	if (height > 96) {
		width = width / (height / 96);
		height = 96;
	}
	canvas.width = width;
	canvas.height = height;
	canvas.style.width = width * ZOOM + "px";
	canvas.style.height = height * ZOOM + "px";
	ctx.fillStyle = `rgba(255,255,255)`;
	ctx.fillRect(0, 0, width, height);

	const resolutionValue = `${width}x${height}`;
	if (
		Array.from(resolutionSelect.options).some(
			(option) => option.value === resolutionValue,
		)
	) {
		resolutionSelect.value = resolutionValue;
	} else {
		resolutionSelect.value = "16x16";
	}
	updatePreviews();
	if (!keepURL) {
		updateUrlWithCanvasData();
	}
	drawGrid();
}

resolutionSelect.addEventListener("change", async function () {
	const selectedValue = this.value;
	const parts = selectedValue.split("x");
	const newWidth = parseInt(parts[0], 10);
	const newHeight = parseInt(parts[1], 10);
	const id = await createImageBitmap(
		ctx.getImageData(0, 0, canvas.width, canvas.height),
	);
	createNewCanvas(newWidth, newHeight, true);
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(id, 0, 0, canvas.width, canvas.height);
	updatePreviews();
	updateUrlWithCanvasData(true); // 戻るボタンで戻れる
});

/**
 * @param {PointerEvent|MouseEvent} e
 */
function getCoordinates(e) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: Math.floor(((e.clientX - rect.left) * canvas.width) / rect.width),
		y: Math.floor(((e.clientY - rect.top) * canvas.height) / rect.height),
	};
}

/**
 * @param {PointerEvent | MouseEvent} e
 */
function draw(e) {
	const { x, y } = getCoordinates(e);
	const id = ctx.getImageData(x, y, 1, 1);
	if (id.data.slice(0, 3).every((a) => a == 0)) {
		ctx.fillStyle = `rgba(255,255,255)`;
	} else {
		ctx.fillStyle = `rgba(0,0,0)`;
	}
	ctx.fillRect(x, y, 1, 1);
	updatePreviews();
	updateUrlWithCanvasData();
}

/**
 * @param {PointerEvent} e
 */
function drawPreview(e) {
	const { x, y } = getCoordinates(e);
	dp.style.left = `${x * ZOOM}px`;
	dp.style.top = `${y * ZOOM}px`;
}

canvas.addEventListener("click", (e) => {
	e.preventDefault();
	draw(e);
});

canvas.addEventListener("pointermove", (e) => {
	e.preventDefault();
	drawPreview(e);
});

canvas.addEventListener("pointerleave", () => {
	dp.style.opacity = "0";
});

canvas.addEventListener("pointerenter", () => {
	dp.style.opacity = "1";
});

gridToggle.addEventListener("change", function () {
	isGridEnabled = this.checked;
	drawGrid();
	if (isGridEnabled) {
		gridCanvas.style.display = "block";
	} else {
		gridCanvas.style.display = "none";
	}
});

clearButton.addEventListener("click", function () {
	const size = canvas.width;
	ctx.fillStyle = `rgba(255,255,255)`;
	ctx.fillRect(0, 0, size, size);
	updatePreviews();
	updateUrlWithCanvasData(true);
});

function imgdata() {
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;
	const width = canvas.width;
	const height = canvas.height;
	const blocks = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x += 32) {
			let blocknum = 0;
			for (let bitIndex = 0; bitIndex < 32; bitIndex++) {
				const currentPixelX = x + bitIndex;
				if (currentPixelX >= width) {
					break;
				}
				const dataIndex = (y * width + currentPixelX) * 4;
				const r = data[dataIndex];
				const g = data[dataIndex + 1];
				const b = data[dataIndex + 2];
				const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				blocknum = (blocknum << 1) | (luminance > 127 ? 1 : 0);
			}
			blocks.push(blocknum >>> 0);
		}
	}
	return `${width}-${height}-` + blocks.join("-");
}
openImage.addEventListener("click", function () {
	canvas.toBlob((blob) => {
		if (!blob) {
			alert("画像を開けません");
			throw new Error("blob is null");
		}
		const url = URL.createObjectURL(blob);
		globalThis.open(url, "_blank");
	});
});

fileInput.addEventListener("change", function (event) {
	// @ts-ignore
	const file = event.target.files[0];
	if (!file) {
		return;
	}

	if (!file.type.startsWith("image/")) {
		alert("画像ファイルを選択してください。");
		return;
	}

	const reader = new FileReader();
	reader.onload = function (e) {
		const img = new Image();
		img.onload = () => {
			if (
				globalThis.confirm(
					"選択した画像をキャンバスに読み込みますか？現在の内容は失われます。",
				)
			) {
				createNewCanvas(img.width, img.height, true);
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				updatePreviews();
				updateUrlWithCanvasData(true); // 戻るボタンで戻れる
			}
		};
		img.onerror = () => {
			alert("画像の読み込みに失敗しました。");
		};
		// @ts-ignore
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
});

try {
	if (dataParam) {
		if (dataParam.startsWith("data:image")) {
			const img = new Image();
			img.onload = () => {
				createNewCanvas(img.width, img.height, true);
				ctx.drawImage(img, 0, 0);
				updateUrlWithCanvasData(true); // 戻るボタンで戻れる
			};
			img.onerror = () => {
				console.error(
					"URLデータのデコードに失敗しました。無効な画像データです。",
				);
				createNewCanvas(16, 16);
			};
			img.src = dataParam;
		} else {
			const datas = dataParam.split("-").map((a) => Number(a));
			const width = datas[0];
			const height = datas[1];
			const encodedBlocks = datas.slice(2);
			createNewCanvas(width, height);
			let blockIndex = 0;
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x += 32) {
					const currentBlockValue = encodedBlocks[blockIndex] >>> 0;
					blockIndex++;
					for (let bitIndex = 0; bitIndex < 32; bitIndex++) {
						const currentPixelX = x + bitIndex;
						const bsize = Math.max(width - x - 1, 31);
						if (currentPixelX >= width) {
							break;
						}
						const pixelIsWhite =
							((currentBlockValue >> (bsize - bitIndex)) & 1) === 1;

						if (pixelIsWhite) {
							ctx.fillStyle = `rgba(255,255,255)`;
						} else {
							ctx.fillStyle = `rgba(0,0,0)`;
						}
						ctx.fillRect(currentPixelX, y, 1, 1);
					}
				}
			}
		}
		updatePreviews();
		updateUrlWithCanvasData();
	} else {
		createNewCanvas(16, 16);
	}
} catch (e) {
	console.error(e);
	createNewCanvas(16, 16);
}

// @ts-ignore
document.getElementById("main").style.display = "block";
document.getElementById("loading")?.remove();
