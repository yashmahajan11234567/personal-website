import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/cloud-world-3d/CloudWorld3D.tsx");const useEffect = __vite__cjsImport0_react["useEffect"]; const useRef = __vite__cjsImport0_react["useRef"]; const useState = __vite__cjsImport0_react["useState"]; const useMemo = __vite__cjsImport0_react["useMemo"];const _jsxDEV = __vite__cjsImport8_react_jsxDevRuntime["jsxDEV"]; const _Fragment = __vite__cjsImport8_react_jsxDevRuntime["Fragment"];import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=f8390340";
import { Canvas, useFrame, useThree } from "/node_modules/.vite/deps/@react-three_fiber.js?v=f8390340";
import { OrbitControls, Html } from "/node_modules/.vite/deps/@react-three_drei.js?v=f8390340";
import { EffectComposer, EffectGroup } from "/node_modules/.vite/deps/@react-three_postprocessing.js?v=f8390340";
import { Vignette, Noise } from "/node_modules/.vite/deps/@react-three_postprocessing.js?v=f8390340";
import { EffectComposer as EffectComposerType } from "/node_modules/.vite/deps/postprocessing.js?v=f8390340";
import * as THREE from "/node_modules/.vite/deps/three.js?v=f8390340";
import "/src/cloud-world-3d/CloudWorld3D.css";
var _jsxFileName = "D:/Yash/personal-website/src/cloud-world-3d/CloudWorld3D.tsx";
import __vite__cjsImport8_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=f8390340";
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$(), _s5 = $RefreshSig$(), _s6 = $RefreshSig$(), _s7 = $RefreshSig$(), _s8 = $RefreshSig$(), _s9 = $RefreshSig$(), _s10 = $RefreshSig$(), _s11 = $RefreshSig$(), _s12 = $RefreshSig$();
// Module-level flag to prevent duplicate FrameDriver loops in React.StrictMode
let frameDriverRunning = false;
function FrameDriver({ composerRef }) {
	_s();
	const { gl, advance } = useThree();
	const frameIdRef = useRef(null);
	const lastTimeRef = useRef(performance.now());
	const composerReadyRef = useRef(false);
	useEffect(() => {
		// Prevent multiple loops - use module-level flag
		if (frameDriverRunning) {
			console.log("[FrameDriver] Loop already running (module-level), skipping");
			return;
		}
		frameDriverRunning = true;
		console.log("[FrameDriver] Effect started");
		// Manual render loop for frameloop="never"
		let frameCount = 0;
		const loop = (time) => {
			frameIdRef.current = requestAnimationFrame(loop);
			frameCount++;
			const delta = (time - lastTimeRef.current) / 1e3;
			lastTimeRef.current = time;
			// Advance R3F state (clock, etc.)
			advance(time, true);
			// Render via EffectComposer - wait for composer to be ready
			if (composerRef.current && !composerReadyRef.current) {
				composerReadyRef.current = true;
				const composer = composerRef.current;
				console.log("[FrameDriver] Composer found, rendering...", {
					composerType: composer.constructor?.name,
					passes: composer.passes?.length,
					autoRenderToScreen: composer.autoRenderToScreen,
					inputBuffer: composer.inputBuffer ? "yes" : "no",
					outputBuffer: composer.outputBuffer ? "yes" : "no",
					passDetails: composer.passes?.map((p, i) => ({
						index: i,
						type: p.constructor?.name,
						enabled: p.enabled
					}))
				});
			}
			if (composerReadyRef.current && composerRef.current) {
				// Let composer handle autoClear and render to screen
				composerRef.current.render(delta);
			}
		};
		frameIdRef.current = requestAnimationFrame(loop);
		return () => {
			console.log("[FrameDriver] Cleanup, frames rendered:", frameCount);
			if (frameIdRef.current !== null) {
				cancelAnimationFrame(frameIdRef.current);
				frameIdRef.current = null;
			}
			frameDriverRunning = false;
			composerReadyRef.current = false;
		};
	}, [gl, advance]);
	return null;
}
_s(FrameDriver, "lRUKXLF9qDCPfny7Ga6fljNxS4E=", false, function() {
	return [useThree];
});
_c = FrameDriver;
// Skill stops data from projects.data.ts
const SKILL_STOPS = [
	{
		id: "aws",
		name: "AWS",
		x: -4,
		z: -20,
		side: "left"
	},
	{
		id: "terraform",
		name: "Terraform",
		x: 4,
		z: -20,
		side: "right"
	},
	{
		id: "docker",
		name: "Docker",
		x: -4,
		z: 10,
		side: "left"
	},
	{
		id: "kubernetes",
		name: "Kubernetes",
		x: 4,
		z: 10,
		side: "right"
	},
	{
		id: "linux",
		name: "Linux",
		x: -4,
		z: 40,
		side: "left"
	},
	{
		id: "git",
		name: "Git",
		x: 4,
		z: 40,
		side: "right"
	},
	{
		id: "cicd",
		name: "CI/CD",
		x: -4,
		z: 70,
		side: "left"
	}
];
// Project data from projects.data.ts
const PROJECT_DATA = [
	{
		id: "nifty100-financial-analysis",
		title: "Nifty-100 Financial Analysis",
		github: "https://github.com/yashmahajan11234567/Bluestock_fintech",
		technologies: [
			"Python",
			"pandas",
			"SQLite",
			"T-SQL",
			"FastAPI",
			"Streamlit"
		]
	},
	{
		id: "sql-data-warehouse",
		title: "SQL Data Warehouse & ETL",
		github: "https://github.com/yashmahajan11234567/Sql-data-warehouse",
		technologies: [
			"T-SQL",
			"SQL Server",
			"BULK INSERT",
			"Window Functions",
			"Star Schema"
		]
	},
	{
		id: "primetradeai",
		title: "PRIMETradeAI",
		github: "https://github.com/yashmahajan11234567/PRIMETradeAI",
		technologies: [
			"T-SQL",
			"Python",
			"pandas",
			"scikit-learn",
			"Random Forest",
			"KMeans",
			"Streamlit"
		]
	},
	{
		id: "data-analytics-dashboards",
		title: "Data Analytics Dashboards",
		github: "https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects",
		technologies: [
			"Excel",
			"Tableau",
			"Power BI"
		]
	}
];
export const CloudWorld3D = ({ onExit }) => {
	_s2();
	const [reducedMotion, setReducedMotion] = useState(false);
	const [webglAvailable, setWebglAvailable] = useState(true);
	const containerRef = useRef(null);
	const composerRef = useRef(null);
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mediaQuery.matches);
		const handler = (e) => setReducedMotion(e.matches);
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);
	useEffect(() => {
		const canvas = document.createElement("canvas");
		try {
			const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
			setWebglAvailable(!!gl);
		} catch {
			setWebglAvailable(false);
		}
	}, []);
	const handleKeyDown = (e) => {
		if (e.key === "Escape") {
			onExit();
		}
	};
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onExit]);
	if (!webglAvailable) {
		return /* @__PURE__ */ _jsxDEV("div", {
			className: "cloud-world-fallback",
			role: "region",
			"aria-label": "Cloud World - WebGL not available",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "fallback-content",
				children: [
					/* @__PURE__ */ _jsxDEV("h1", { children: "Cloud World" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 163,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("p", { children: "Your browser doesn't support WebGL, which is required for the 3D experience." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onExit,
						className: "exit-button",
						children: "Return to Portfolio"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 162,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 161,
			columnNumber: 7
		}, this);
	}
	if (reducedMotion) {
		return /* @__PURE__ */ _jsxDEV("div", {
			className: "cloud-world-reduced",
			role: "region",
			"aria-label": "Cloud World - Reduced motion",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "reduced-content",
				children: [
					/* @__PURE__ */ _jsxDEV("h1", { children: "Cloud World" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 175,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("p", { children: "Reduced motion is enabled. The 3D experience is disabled for comfort." }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 176,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						onClick: onExit,
						className: "exit-button",
						children: "Return to Portfolio"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 177,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 174,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 173,
			columnNumber: 7
		}, this);
	}
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "cloud-world-container",
		ref: containerRef,
		children: [/* @__PURE__ */ _jsxDEV(Canvas, {
			camera: {
				position: [
					0,
					8,
					25
				],
				fov: 50,
				near: .1,
				far: 2e4
			},
			onCreated: ({ gl }) => {
				gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			},
			style: { touchAction: "none" },
			gl: {
				preserveDrawingBuffer: true,
				antialias: true,
				alpha: false,
				stencil: true,
				depth: true,
				powerPreference: "high-performance"
			},
			frameloop: "never",
			children: [
				/* @__PURE__ */ _jsxDEV(SunsetSkySphere, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 195,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("hemisphereLight", {
					intensity: .7,
					groundColor: "#C8A878",
					color: "#FFE8C0"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 198,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("directionalLight", {
					position: [
						25,
						50,
						-20
					],
					intensity: 1.6,
					castShadow: true,
					children: /* @__PURE__ */ _jsxDEV("orthographicCamera", {
						attach: "shadowCamera",
						args: [
							-50,
							50,
							50,
							-50,
							.1,
							150
						]
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 200,
						columnNumber: 17
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 199,
					columnNumber: 15
				}, this),
				/* @__PURE__ */ _jsxDEV(SkillsValleyZone, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 209,
					columnNumber: 15
				}, this),
				/* @__PURE__ */ _jsxDEV(MountainPassageZone, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 210,
					columnNumber: 15
				}, this),
				/* @__PURE__ */ _jsxDEV(ProjectsSunsetZone, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 211,
					columnNumber: 15
				}, this),
				SKILL_STOPS.map((stop) => /* @__PURE__ */ _jsxDEV(SkillMarker, { stop }, stop.id, false, {
					fileName: _jsxFileName,
					lineNumber: 215,
					columnNumber: 11
				}, this)),
				PROJECT_DATA.map((project) => /* @__PURE__ */ _jsxDEV(ProjectMarker, { project }, project.id, false, {
					fileName: _jsxFileName,
					lineNumber: 218,
					columnNumber: 11
				}, this)),
				/* @__PURE__ */ _jsxDEV(CloudCharacter, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 221,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV(OrbitControls, {
					enablePan: false,
					enableZoom: true,
					enableRotate: true,
					minDistance: 15,
					maxDistance: 40,
					minPolarAngle: Math.PI * .2,
					maxPolarAngle: Math.PI * .8,
					target: [
						0,
						8,
						0
					],
					enableDamping: true,
					dampingFactor: .05,
					rotateSpeed: .5,
					zoomSpeed: .5
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 224,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV(FrameDriver, { composerRef }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 240,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV(EffectComposer, {
					ref: composerRef,
					multisampling: 0,
					autoRenderToScreen: true,
					renderPriority: 1,
					children: /* @__PURE__ */ _jsxDEV(EffectGroup, { children: [/* @__PURE__ */ _jsxDEV(Noise, { opacity: .015 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 250,
						columnNumber: 21
					}, this), /* @__PURE__ */ _jsxDEV(Vignette, {
						offset: .35,
						darkness: .4,
						eskil: false
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 251,
						columnNumber: 21
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 249,
						columnNumber: 19
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 243,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 185,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "cloud-world-overlay",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "overlay-content",
				children: [/* @__PURE__ */ _jsxDEV("header", {
					className: "overlay-header",
					children: [/* @__PURE__ */ _jsxDEV("h2", {
						id: "overlay-title",
						children: "Cloud World"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 260,
						columnNumber: 13
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						onClick: onExit,
						className: "exit-button",
						"aria-label": "Exit Cloud World",
						children: "×"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 261,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 259,
					columnNumber: 11
				}, this), /* @__PURE__ */ _jsxDEV("main", {
					className: "overlay-main",
					children: /* @__PURE__ */ _jsxDEV("div", {
						id: "overlay-body",
						children: [/* @__PURE__ */ _jsxDEV("p", {
							className: "placeholder-text",
							children: "Journey through Skills Valley → Mountain Passage → Projects Sunset"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 265,
							columnNumber: 15
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "journey-hint",
							children: [
								/* @__PURE__ */ _jsxDEV("kbd", { children: "WASD" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 269,
									columnNumber: 17
								}, this),
								" / ",
								/* @__PURE__ */ _jsxDEV("kbd", { children: "Arrow Keys" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 269,
									columnNumber: 35
								}, this),
								" Move Character \xA0",
								/* @__PURE__ */ _jsxDEV("kbd", { children: "Mouse" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 270,
									columnNumber: 17
								}, this),
								" Look Around \xA0",
								/* @__PURE__ */ _jsxDEV("kbd", { children: "Click" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 271,
									columnNumber: 17
								}, this),
								" on markers for details \xA0",
								/* @__PURE__ */ _jsxDEV("kbd", { children: "Esc" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 272,
									columnNumber: 17
								}, this),
								" Exit"
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 268,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 264,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 263,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 258,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 257,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 184,
		columnNumber: 5
	}, this);
};
_s2(CloudWorld3D, "xpPAMwdwOByq3uWHezbJNn9cjpY=");
_c2 = CloudWorld3D;
function SunsetSkySphere() {
	_s3();
	// Shader-based sky gradient matching skills-valley.png reference
	// Zenith (looking up): #FFB74D (deep orange)
	// Horizon: #FFCC80 (pale orange)
	// Nadir (looking down): #FFB74D (deep orange, mirrors zenith)
	// Using canvas-generated gradient texture on BackSide sphere
	const gradientTexture = useMemo(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext("2d");
		if (!ctx) return new THREE.Texture();
		// Create vertical gradient matching Three.js UV coordinates
		// Three.js UV sphere: V=1 at zenith (+Y), V=0.5 at horizon, V=0 at nadir (-Y)
		// Canvas y=0 (top) = V=1 (zenith), Canvas y=256 (bottom) = V=0 (nadir)
		const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
		gradient.addColorStop(0, "#FFB74D");
		gradient.addColorStop(.5, "#FFCC80");
		gradient.addColorStop(1, "#FFB74D");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		texture.flipY = false;
		return texture;
	}, []);
	return /* @__PURE__ */ _jsxDEV("mesh", {
		position: [
			0,
			0,
			0
		],
		scale: [
			2e4,
			2e4,
			2e4
		],
		renderOrder: -9999,
		frustumCulled: false,
		children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
			1,
			64,
			64
		] }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 317,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("meshBasicMaterial", {
			map: gradientTexture,
			side: THREE.BackSide,
			depthWrite: false,
			depthTest: false,
			fog: false
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 318,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 316,
		columnNumber: 5
	}, this);
}
_s3(SunsetSkySphere, "jZHSlbg4p074U5umspg3Ft7NHd0=");
_c3 = SunsetSkySphere;
function SkillsValleyZone() {
	_s4();
	const groupRef = useRef(null);
	useFrame((_, delta) => {
		if (groupRef.current) {
			// Slow rotation for valley ambiance
			groupRef.current.rotation.y += delta * .005;
		}
	});
	return /* @__PURE__ */ _jsxDEV("group", {
		ref: groupRef,
		position: [
			0,
			0,
			0
		],
		children: [
			/* @__PURE__ */ _jsxDEV(DistantMountains, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 342,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ _jsxDEV(ValleyFloor, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 345,
				columnNumber: 9
			}, this),
			Array.from({ length: 10 }).map((_, hillIndex) => /* @__PURE__ */ _jsxDEV(ValleyHill, { index: hillIndex }, hillIndex, false, {
				fileName: _jsxFileName,
				lineNumber: 349,
				columnNumber: 11
			}, this)),
			Array.from({ length: 16 }).map((_, treeIndex) => /* @__PURE__ */ _jsxDEV(PineTree, { index: treeIndex }, treeIndex, false, {
				fileName: _jsxFileName,
				lineNumber: 354,
				columnNumber: 11
			}, this)),
			Array.from({ length: 6 }).map((_, rockIndex) => /* @__PURE__ */ _jsxDEV(ValleyRock, { index: rockIndex }, rockIndex, false, {
				fileName: _jsxFileName,
				lineNumber: 359,
				columnNumber: 11
			}, this)),
			/* @__PURE__ */ _jsxDEV(InstancedClouds, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 363,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 340,
		columnNumber: 7
	}, this);
}
_s4(SkillsValleyZone, "z+BGKNZSG9jHmNgDBB7SECNqnkU=", false, function() {
	return [useFrame];
});
_c4 = SkillsValleyZone;
function InstancedClouds() {
	_s5();
	// Custom layered cloud geometry matching skills-valley.png reference
	// Clouds: pure white (#FFFFFF) with subtle off-white shading (#F5F5F5)
	// Using MeshBasicMaterial for pure unlit white clouds that glow against the sky
	// 4 cloud formations, each with 2-3 lobes for natural fluffy appearance
	// REDUCED SCALE: smaller, more deliberate formations with better depth
	const cloudFormations = useMemo(() => {
		const formations = [
			(
			// Formation 1 - left foreground (lower, smaller)
			{
				lobes: [
					{
						x: -35,
						y: 14,
						z: -30,
						scale: new THREE.Vector3(4, 2.5, 3),
						rotation: new THREE.Euler(0, 0, 0)
					},
					{
						x: -32,
						y: 15,
						z: -28,
						scale: new THREE.Vector3(2.5, 1.5, 2),
						rotation: new THREE.Euler(0, .2, 0)
					},
					{
						x: -38,
						y: 14.5,
						z: -32,
						scale: new THREE.Vector3(2, 1.2, 1.5),
						rotation: new THREE.Euler(0, -.1, 0)
					}
				],
				material: {
					color: "#FFFFFF",
					opacity: .95
				}
			}),
			(
			// Formation 2 - right foreground (lower, smaller)
			{
				lobes: [
					{
						x: 40,
						y: 13,
						z: -15,
						scale: new THREE.Vector3(3.5, 2, 2.5),
						rotation: new THREE.Euler(0, 0, 0)
					},
					{
						x: 43,
						y: 14,
						z: -13,
						scale: new THREE.Vector3(2, 1.2, 1.5),
						rotation: new THREE.Euler(0, -.3, 0)
					},
					{
						x: 37,
						y: 13.5,
						z: -16,
						scale: new THREE.Vector3(1.8, 1, 1.3),
						rotation: new THREE.Euler(0, .1, 0)
					}
				],
				material: {
					color: "#FFFFFF",
					opacity: .9
				}
			}),
			(
			// Formation 3 - center midground (smaller)
			{
				lobes: [
					{
						x: 0,
						y: 18,
						z: 5,
						scale: new THREE.Vector3(4.5, 3, 3.5),
						rotation: new THREE.Euler(0, 0, 0)
					},
					{
						x: 3,
						y: 19,
						z: 6,
						scale: new THREE.Vector3(3, 1.8, 2.5),
						rotation: new THREE.Euler(0, .4, 0)
					},
					{
						x: -3,
						y: 18.5,
						z: 4,
						scale: new THREE.Vector3(2, 1.2, 1.5),
						rotation: new THREE.Euler(0, -.2, 0)
					}
				],
				material: {
					color: "#FFFFFF",
					opacity: .95
				}
			}),
			(
			// Formation 4 - far background (smaller, softer)
			{
				lobes: [
					{
						x: -45,
						y: 20,
						z: 35,
						scale: new THREE.Vector3(5.5, 3, 4),
						rotation: new THREE.Euler(0, 0, 0)
					},
					{
						x: -38,
						y: 21,
						z: 38,
						scale: new THREE.Vector3(4, 2.2, 3),
						rotation: new THREE.Euler(0, .3, 0)
					},
					{
						x: 48,
						y: 19,
						z: 42,
						scale: new THREE.Vector3(5, 2.5, 3.5),
						rotation: new THREE.Euler(0, -.2, 0)
					}
				],
				material: {
					color: "#F5F5F5",
					opacity: .8
				}
			})
		];
		return formations;
	}, []);
	return /* @__PURE__ */ _jsxDEV("group", { children: cloudFormations.map((formation, fIndex) => /* @__PURE__ */ _jsxDEV("group", { children: formation.lobes.map((lobe, lIndex) => /* @__PURE__ */ _jsxDEV("mesh", {
		position: new THREE.Vector3(lobe.x, lobe.y, lobe.z),
		scale: lobe.scale,
		rotation: lobe.rotation,
		children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
			1,
			16,
			12
		] }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 427,
			columnNumber: 15
		}, this), /* @__PURE__ */ _jsxDEV("meshBasicMaterial", {
			color: formation.material.color,
			transparent: true,
			opacity: formation.material.opacity,
			depthWrite: false
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 428,
			columnNumber: 15
		}, this)]
	}, `${fIndex}-${lIndex}`, true, {
		fileName: _jsxFileName,
		lineNumber: 421,
		columnNumber: 13
	}, this)) }, fIndex, false, {
		fileName: _jsxFileName,
		lineNumber: 419,
		columnNumber: 9
	}, this)) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 417,
		columnNumber: 5
	}, this);
}
_s5(InstancedClouds, "Kcbj+5j7v+JiuiyRN/PoRoog0jY=");
_c5 = InstancedClouds;
function DistantMountains() {
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			0,
			0,
			100
		],
		children: [
			Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ _jsxDEV("mesh", {
				receiveShadow: true,
				position: [
					-60 + i * 30,
					-2 + Math.sin(i) * 3,
					-80 + i * 15
				],
				rotation: [
					0,
					Math.PI / 2 + i * .2,
					0
				],
				scale: [
					40,
					25 + i * 8,
					40
				],
				children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
					1,
					1,
					6
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 454,
					columnNumber: 11
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#6B5B3A",
					roughness: .95,
					metalness: .01,
					transparent: true,
					opacity: .4
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 455,
					columnNumber: 11
				}, this)]
			}, i, true, {
				fileName: _jsxFileName,
				lineNumber: 447,
				columnNumber: 9
			}, this)),
			Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ _jsxDEV("mesh", {
				receiveShadow: true,
				position: [
					-45 + i * 30,
					-1 + Math.sin(i * 1.5) * 2,
					-40 + i * 12
				],
				rotation: [
					0,
					Math.PI / 2 + i * .3,
					0
				],
				scale: [
					30,
					20 + i * 6,
					30
				],
				children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
					1,
					1,
					8
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 474,
					columnNumber: 11
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#7A6B4A",
					roughness: .9,
					metalness: .02,
					transparent: true,
					opacity: .6
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 475,
					columnNumber: 11
				}, this)]
			}, i, true, {
				fileName: _jsxFileName,
				lineNumber: 467,
				columnNumber: 9
			}, this)),
			Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ _jsxDEV("mesh", {
				receiveShadow: true,
				position: [
					-30 + i * 20,
					5 + Math.sin(i) * 3,
					-20 + i * 10
				],
				rotation: [
					0,
					Math.PI / 2 + i * .4,
					0
				],
				scale: [
					20,
					18 + i * 5,
					20
				],
				children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
					1,
					1,
					10
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 494,
					columnNumber: 11
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#8A7B5A",
					roughness: .85,
					metalness: .03,
					transparent: true,
					opacity: .7
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 495,
					columnNumber: 11
				}, this)]
			}, i, true, {
				fileName: _jsxFileName,
				lineNumber: 487,
				columnNumber: 9
			}, this))
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 444,
		columnNumber: 5
	}, this);
}
_c6 = DistantMountains;
function ValleyFloor() {
	_s6();
	// Winding bezier path through the valley
	const pathCurve = useMemo(() => {
		return new THREE.CatmullRomCurve3([
			new THREE.Vector3(0, 0, -70),
			new THREE.Vector3(-3, 0, -30),
			new THREE.Vector3(2, 0, 10),
			new THREE.Vector3(-1, 0, 50),
			new THREE.Vector3(0, 0, 80)
		]);
	}, []);
	const pathTubeGeometry = useMemo(() => new THREE.TubeGeometry(pathCurve, 200, 3.5, 8, false), [pathCurve]);
	const pathEdgeGeometry = useMemo(() => new THREE.TubeGeometry(pathCurve, 200, 3.8, 8, false), [pathCurve]);
	return /* @__PURE__ */ _jsxDEV("group", { children: [
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				220,
				220,
				60,
				60
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 527,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3D7A2E",
				roughness: .9,
				metalness: .05
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 528,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 526,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			geometry: pathTubeGeometry,
			children: /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#D2A679",
				roughness: .95,
				metalness: 0
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 537,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 536,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			geometry: pathEdgeGeometry,
			children: /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#D2A679",
				roughness: .98,
				metalness: 0,
				side: THREE.DoubleSide
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 546,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 545,
			columnNumber: 7
		}, this),
		Array.from({ length: 30 }).map((_, i) => /* @__PURE__ */ _jsxDEV(GrassPatch, {
			index: i,
			curve: pathCurve
		}, i, false, {
			fileName: _jsxFileName,
			lineNumber: 556,
			columnNumber: 9
		}, this))
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 524,
		columnNumber: 5
	}, this);
}
_s6(ValleyFloor, "epxF18q9QBpKVeglG0aAQ+umxS0=");
_c7 = ValleyFloor;
function GrassPatch({ index, curve }) {
	const side = index % 2 === 0 ? -1 : 1;
	const progress = Math.floor(index / 2) / 15;
	// Use curve for natural placement along winding path
	const curveProgress = progress;
	const pointOnCurve = curve ? curve.getPointAt(curveProgress) : new THREE.Vector3(0, 0, 0);
	const z = pointOnCurve ? pointOnCurve.z : -70 + progress * 140;
	const baseX = pointOnCurve ? pointOnCurve.x : 0;
	const x = baseX + side * (4.5 + Math.sin(index * .7) * 1.5);
	const y = .3;
	const scale = .5 + Math.sin(index * 1.3) * .25;
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			y,
			z
		],
		scale: [
			scale,
			scale,
			scale
		],
		children: [/* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
				.35,
				.6,
				4
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 578,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#2E7D2E",
				roughness: .9
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 579,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 577,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			position: [
				0,
				.15,
				0
			],
			scale: [
				.7,
				.7,
				.7
			],
			children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
				.25,
				.45,
				4
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 582,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#1F4D1F",
				roughness: .95
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 583,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 581,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 576,
		columnNumber: 5
	}, this);
}
_c8 = GrassPatch;
function ValleyRock({ index }) {
	// Deterministic placement along valley sides - more organic placement
	const side = index % 2 === 0 ? -1 : 1;
	const angle = index / 8 * Math.PI * .8 + Math.sin(index) * .3;
	const radius = 45 + Math.cos(index * 1.7) * 30;
	const x = side * Math.cos(angle) * radius;
	const z = Math.sin(angle) * radius;
	const y = 1.5;
	const scale = 1.5 + Math.sin(index * 1.3) * 1;
	const rotationY = angle + Math.PI / 2 + side * .5;
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			y,
			z
		],
		rotation: [
			0,
			rotationY,
			0
		],
		scale: [
			scale,
			scale * .6,
			scale
		],
		children: [/* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
				1,
				16,
				12
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 603,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3A4A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 604,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 602,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			position: [
				0,
				.3,
				0
			],
			scale: [
				.7,
				.5,
				.7
			],
			children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
				1,
				16,
				12
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 611,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#2A2A3A",
				roughness: .98,
				metalness: .01
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 612,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 610,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 601,
		columnNumber: 5
	}, this);
}
_c9 = ValleyRock;
function ValleyHill({ index }) {
	const progress = index / 10;
	const angle = progress * Math.PI * 2 - Math.PI;
	const radius = 65 + Math.sin(progress * Math.PI) * 35;
	const x = Math.cos(angle) * radius;
	const z = Math.sin(angle) * radius;
	const width = 20 + Math.sin(progress * Math.PI * 2) * 12;
	const depth = 12 + Math.sin(progress * Math.PI * 1.5) * 8;
	const height = 2.5 + Math.sin(progress * Math.PI) * 3.5;
	// Atmospheric perspective colors matching skills-valley.png reference:
	// Foreground (index 0-2): olive green #6B8E23 → #7A9E3A
	// Midground (index 3-5): pale sage #8FBC8F → #A3C47D
	// Background (index 6-9): tan-brown #D2B48C
	const hillColors = [
		"#6B8E23",
		"#7A9E3A",
		"#8FBC8F",
		"#A3C47D",
		"#D2B48C"
	];
	const colorIndex = Math.min(index, hillColors.length - 1);
	const baseColor = hillColors[colorIndex];
	return /* @__PURE__ */ _jsxDEV("mesh", {
		position: [
			x,
			height / 2,
			z
		],
		rotation: [
			0,
			angle + Math.PI / 2,
			0
		],
		scale: [
			width,
			height,
			depth
		],
		receiveShadow: true,
		children: [/* @__PURE__ */ _jsxDEV("boxGeometry", { args: [
			1,
			1,
			1
		] }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 647,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
			color: baseColor,
			roughness: .85,
			metalness: .02
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 648,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 641,
		columnNumber: 5
	}, this);
}
_c10 = ValleyHill;
function PineTree({ index }) {
	// Deterministic placement for consistency - improved hierarchy matching skills-valley.png
	// Foreground (index 0-3): large framing trees, warm sunset greens
	// Midground (index 4-10): medium sunset greens, on hill ridges
	// Background (index 11-15): smaller warm greens, on distant hills
	const isForeground = index < 4;
	const isMidground = index >= 4 && index < 11;
	let x, z, radius, trunkHeight, canopyHeight, canopyWidth, canopyColor1, canopyColor2, canopyColor3;
	if (isForeground) {
		// Foreground: large trees framing the view - warm sunset greens
		const angle = index / 4 * Math.PI * 2 + Math.sin(index) * .3;
		radius = 30 + Math.sin(index * 1.7) * 15;
		x = Math.cos(angle) * radius;
		z = Math.sin(angle) * radius;
		trunkHeight = 6 + Math.sin(index * 1.1) * 1.5;
		canopyHeight = 7 + Math.sin(index * 1.3) * 2;
		canopyWidth = 3.5 + Math.sin(index * .9) * 1.5;
		canopyColor1 = "#2E2A1A";
		canopyColor2 = "#3E3A2A";
		canopyColor3 = "#4E4A3A";
	} else if (isMidground) {
		const midIndex = index - 4;
		const angle = midIndex / 7 * Math.PI * 2 + Math.sin(midIndex) * .3;
		radius = 45 + Math.sin(midIndex * 1.7) * 25;
		x = Math.cos(angle) * radius;
		z = Math.sin(angle) * radius;
		trunkHeight = 4.5 + Math.sin(midIndex * 1.1) * 1.5;
		canopyHeight = 5.5 + Math.sin(midIndex * 1.3) * 2;
		canopyWidth = 2.5 + Math.sin(midIndex * .9) * 1.5;
		canopyColor1 = "#3E3A2A";
		canopyColor2 = "#4E4A3A";
		canopyColor3 = "#5E5A4A";
	} else {
		const bgIndex = index - 11;
		const angle = bgIndex / 5 * Math.PI * 2 + Math.sin(bgIndex) * .3;
		radius = 70 + Math.sin(bgIndex * 1.7) * 30;
		x = Math.cos(angle) * radius;
		z = Math.sin(angle) * radius;
		trunkHeight = 3.5 + Math.sin(bgIndex * 1.1) * 1.5;
		canopyHeight = 4.5 + Math.sin(bgIndex * 1.3) * 2;
		canopyWidth = 2 + Math.sin(bgIndex * .9) * 1.5;
		canopyColor1 = "#4E4A3A";
		canopyColor2 = "#5E5A4A";
		canopyColor3 = "#6E6A5A";
	}
	const trunkColor = "#2A1A1A";
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			trunkHeight / 2,
			z
		],
		children: [/* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("cylinderGeometry", { args: [
				.45,
				.25,
				trunkHeight,
				6
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 713,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: trunkColor,
				roughness: .9
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 714,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 712,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("group", {
			position: [
				0,
				trunkHeight + canopyHeight / 2,
				0
			],
			children: [
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth,
						canopyHeight,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 720,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor1,
						roughness: .8
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 721,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 719,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					position: [
						0,
						-.25,
						0
					],
					scale: [
						.88,
						.88,
						.88
					],
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth * .88,
						canopyHeight * .85,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 725,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor2,
						roughness: .82
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 726,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 724,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					position: [
						0,
						-.45,
						0
					],
					scale: [
						.75,
						.75,
						.75
					],
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth * .75,
						canopyHeight * .7,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 730,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor3,
						roughness: .85
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 731,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 729,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					position: [
						0,
						-.6,
						0
					],
					scale: [
						.6,
						.6,
						.6
					],
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth * .6,
						canopyHeight * .55,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 735,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor3,
						roughness: .88
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 736,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 734,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 717,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 710,
		columnNumber: 5
	}, this);
}
_c11 = PineTree;
function LeftCliffWall() {
	return /* @__PURE__ */ _jsxDEV("group", { children: [
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				120,
				90,
				40,
				30
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 748,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#4A3A2A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 749,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 747,
			columnNumber: 7
		}, this),
		Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ _jsxDEV(CliffRock, {
			index: i,
			side: "left"
		}, i, false, {
			fileName: _jsxFileName,
			lineNumber: 758,
			columnNumber: 9
		}, this)),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			position: [
				-55,
				2,
				-5
			],
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				100,
				4,
				20,
				4
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 763,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#4A3A2A",
				roughness: .9,
				metalness: .05,
				emissive: "#ff6b35",
				emissiveIntensity: .2
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 764,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 762,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 745,
		columnNumber: 5
	}, this);
}
_c12 = LeftCliffWall;
function RightCliffWall() {
	return /* @__PURE__ */ _jsxDEV("group", { children: [
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			position: [
				0,
				0,
				0
			],
			rotation: [
				0,
				Math.PI,
				0
			],
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				120,
				90,
				40,
				30
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 781,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#4A3A2A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 782,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 780,
			columnNumber: 7
		}, this),
		Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ _jsxDEV(CliffRock, {
			index: i,
			side: "right"
		}, i, false, {
			fileName: _jsxFileName,
			lineNumber: 791,
			columnNumber: 9
		}, this)),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			position: [
				55,
				2,
				-5
			],
			rotation: [
				0,
				Math.PI,
				0
			],
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				100,
				4,
				20,
				4
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 796,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#4A3A2A",
				roughness: .9,
				metalness: .05,
				emissive: "#ff6b35",
				emissiveIntensity: .2
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 797,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 795,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 778,
		columnNumber: 5
	}, this);
}
_c13 = RightCliffWall;
function CliffRock({ index, side }) {
	const sideMult = side === "left" ? -1 : 1;
	const angle = index / 12 * Math.PI * 1.5 + Math.sin(index) * .4;
	const radius = 35 + Math.cos(index * 1.7) * 15;
	const x = sideMult * Math.cos(angle) * radius;
	const z = Math.sin(angle) * radius - 10;
	const y = 2 + Math.sin(index * .7) * 8;
	const scale = 1.2 + Math.sin(index * 1.3) * .8;
	const rotationY = angle + (side === "left" ? Math.PI / 2 : -Math.PI / 2);
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			y,
			z
		],
		rotation: [
			0,
			rotationY,
			0
		],
		scale: [
			scale,
			scale * .6,
			scale
		],
		children: [/* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("dodecahedronGeometry", { args: [1, 0] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 822,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#4A3A2A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 823,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 821,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			position: [
				0,
				.4,
				0
			],
			scale: [
				.7,
				.5,
				.7
			],
			children: [/* @__PURE__ */ _jsxDEV("dodecahedronGeometry", { args: [1, 0] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 830,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3020",
				roughness: .98,
				metalness: .01
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 831,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 829,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 820,
		columnNumber: 5
	}, this);
}
_c14 = CliffRock;
function MountainPassageZone() {
	_s7();
	const groupRef = useRef(null);
	useFrame(() => {
		if (groupRef.current) {
			// Subtle pulsating light in the tunnel
			groupRef.current.position.y = Math.sin(Date.now() * .001) * .5;
		}
	});
	return /* @__PURE__ */ _jsxDEV("group", {
		ref: groupRef,
		position: [
			0,
			0,
			100
		],
		children: [
			/* @__PURE__ */ _jsxDEV(LeftCliffWall, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 854,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV(RightCliffWall, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 857,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV(PassageFloor, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 860,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV(PassageCeiling, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 863,
				columnNumber: 7
			}, this),
			Array.from({ length: 8 }).map((_, rockIndex) => /* @__PURE__ */ _jsxDEV(PassageRock, { index: rockIndex }, rockIndex, false, {
				fileName: _jsxFileName,
				lineNumber: 867,
				columnNumber: 9
			}, this)),
			Array.from({ length: 12 }).map((_, treeIndex) => /* @__PURE__ */ _jsxDEV(PassagePine, { index: treeIndex }, treeIndex, false, {
				fileName: _jsxFileName,
				lineNumber: 872,
				columnNumber: 9
			}, this)),
			/* @__PURE__ */ _jsxDEV(PassageFog, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 876,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 852,
		columnNumber: 5
	}, this);
}
_s7(MountainPassageZone, "z+BGKNZSG9jHmNgDBB7SECNqnkU=", false, function() {
	return [useFrame];
});
_c15 = MountainPassageZone;
function PassageFloor() {
	_s8();
	// Winding narrow path through the passage
	const pathCurve = useMemo(() => {
		return new THREE.CatmullRomCurve3([
			new THREE.Vector3(0, 0, 100),
			new THREE.Vector3(-2, 0, 140),
			new THREE.Vector3(1, 0, 180),
			new THREE.Vector3(-1, 0, 220),
			new THREE.Vector3(0, 0, 250)
		]);
	}, []);
	const pathTubeGeometry = useMemo(() => new THREE.TubeGeometry(pathCurve, 150, 1.5, 8, false), [pathCurve]);
	const edgeGeometry = useMemo(() => new THREE.TubeGeometry(pathCurve, 150, 1.8, 8, false), [pathCurve]);
	return /* @__PURE__ */ _jsxDEV("group", { children: [
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				150,
				150,
				30,
				30
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 900,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3D3A2A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 901,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 899,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			geometry: pathTubeGeometry,
			children: /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#D2A679",
				roughness: .95,
				metalness: 0
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 910,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 909,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			geometry: edgeGeometry,
			children: /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#D2A679",
				roughness: .95,
				metalness: 0,
				side: THREE.DoubleSide
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 919,
				columnNumber: 9
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 918,
			columnNumber: 7
		}, this),
		Array.from({ length: 16 }).map((_, i) => /* @__PURE__ */ _jsxDEV(PassageDebris, {
			index: i,
			curve: pathCurve
		}, i, false, {
			fileName: _jsxFileName,
			lineNumber: 929,
			columnNumber: 9
		}, this))
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 897,
		columnNumber: 5
	}, this);
}
_s8(PassageFloor, "8rNnqidktPp3ke+VkQ9P5q4Zqig=");
_c16 = PassageFloor;
function PassageDebris({ index, curve }) {
	const side = index % 2 === 0 ? -1 : 1;
	const progress = index / 16;
	const pointOnCurve = curve.getPointAt(progress);
	const z = pointOnCurve ? pointOnCurve.z : 100 + progress * 150;
	const baseX = pointOnCurve ? pointOnCurve.x : 0;
	const x = baseX + side * (2.5 + Math.sin(index * .7) * .8);
	const y = .3;
	const scale = .5 + Math.sin(index * 1.3) * .3;
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			y,
			z
		],
		scale: [
			scale,
			scale,
			scale
		],
		children: /* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("dodecahedronGeometry", { args: [1, 0] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 948,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#2A251A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 949,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 947,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 946,
		columnNumber: 5
	}, this);
}
_c17 = PassageDebris;
function PassageCeiling() {
	// Arched partial ceiling
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			0,
			18,
			175
		],
		children: /* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("cylinderGeometry", { args: [
				60,
				60,
				200,
				32,
				1,
				true,
				0,
				Math.PI
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 960,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3A2A",
				roughness: .95,
				metalness: .02,
				side: THREE.DoubleSide
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 961,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 959,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 958,
		columnNumber: 5
	}, this);
}
_c18 = PassageCeiling;
function PassageRock({ index }) {
	const angle = index / 8 * Math.PI * 2;
	const radius = 12 + Math.sin(index * 1.7) * 8;
	const x = Math.cos(angle) * radius;
	const z = Math.sin(angle) * radius;
	const y = 1.5 + Math.sin(index * .7) * 2;
	const scale = 1.2 + Math.sin(index) * .6;
	const rotationY = angle + Math.sin(index * 2) * .5;
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			y,
			z
		],
		rotation: [
			0,
			rotationY,
			0
		],
		scale: [
			scale,
			scale * .7,
			scale
		],
		children: [/* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("dodecahedronGeometry", { args: [1, 0] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 984,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3020",
				roughness: .9,
				metalness: .03
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 985,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 983,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			position: [
				0,
				.5,
				0
			],
			scale: [
				.6,
				.4,
				.6
			],
			children: [/* @__PURE__ */ _jsxDEV("dodecahedronGeometry", { args: [1, 0] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 992,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#2A251A",
				roughness: .95,
				metalness: .02
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 993,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 991,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 982,
		columnNumber: 5
	}, this);
}
_c19 = PassageRock;
function PassagePine({ index }) {
	const side = index % 2 === 0 ? -1 : 1;
	const angle = index / 12 * Math.PI * 1.2 + Math.sin(index) * .4;
	const radius = 42 + Math.sin(index * 1.7) * 10;
	const x = side * Math.cos(angle) * radius;
	const z = Math.sin(angle) * radius + 5;
	const trunkHeight = 4 + Math.sin(index * 1.1) * 2;
	const canopyHeight = 5 + Math.sin(index * 1.3) * 2;
	const canopyWidth = 2.5 + Math.sin(index * .9) * 1;
	// Warmer, more visible pine colors that blend with sunset
	const canopyColor1 = "#2E2A1A";
	const canopyColor2 = "#3E3A2A";
	const canopyColor3 = "#4E4A3A";
	const trunkColor = "#2A1A1A";
	return /* @__PURE__ */ _jsxDEV("group", {
		position: [
			x,
			trunkHeight / 2,
			z
		],
		children: [/* @__PURE__ */ _jsxDEV("mesh", {
			castShadow: true,
			receiveShadow: true,
			children: [/* @__PURE__ */ _jsxDEV("cylinderGeometry", { args: [
				.35,
				.2,
				trunkHeight,
				6
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1023,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: trunkColor,
				roughness: .9
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1024,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1022,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("group", {
			position: [
				0,
				trunkHeight + canopyHeight / 2,
				0
			],
			children: [
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth,
						canopyHeight,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1028,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor1,
						roughness: .85
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1029,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1027,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					position: [
						0,
						-.3,
						0
					],
					scale: [
						.85,
						.85,
						.85
					],
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth * .85,
						canopyHeight * .8,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1032,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor2,
						roughness: .87
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1033,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1031,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ _jsxDEV("mesh", {
					castShadow: true,
					receiveShadow: true,
					position: [
						0,
						-.55,
						0
					],
					scale: [
						.65,
						.65,
						.65
					],
					children: [/* @__PURE__ */ _jsxDEV("coneGeometry", { args: [
						canopyWidth * .65,
						canopyHeight * .6,
						8
					] }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1036,
						columnNumber: 11
					}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
						color: canopyColor3,
						roughness: .9
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1037,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1035,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1026,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1021,
		columnNumber: 5
	}, this);
}
_c20 = PassagePine;
function PassageFog() {
	// Fog plane with gradient density - increases toward sunset (z=250)
	// Using warmer, more transparent fog that blends with sunset sky
	return /* @__PURE__ */ _jsxDEV("group", { children: [
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			position: [
				0,
				1,
				100
			],
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				200,
				150,
				40,
				30
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1050,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3A2A",
				roughness: 1,
				metalness: 0,
				transparent: true,
				opacity: .1,
				side: THREE.DoubleSide
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1051,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1049,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			position: [
				0,
				1,
				175
			],
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				200,
				150,
				40,
				30
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1061,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3A2A",
				roughness: 1,
				metalness: 0,
				transparent: true,
				opacity: .15,
				side: THREE.DoubleSide
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1062,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1060,
			columnNumber: 7
		}, this),
		/* @__PURE__ */ _jsxDEV("mesh", {
			receiveShadow: true,
			position: [
				0,
				1,
				250
			],
			children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
				200,
				150,
				40,
				30
			] }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1072,
				columnNumber: 9
			}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
				color: "#3A3A2A",
				roughness: 1,
				metalness: 0,
				transparent: true,
				opacity: .2,
				side: THREE.DoubleSide
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1073,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 1071,
			columnNumber: 7
		}, this)
	] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1048,
		columnNumber: 5
	}, this);
}
_c21 = PassageFog;
function ProjectsSunsetZone() {
	_s9();
	const groupRef = useRef(null);
	useFrame((_, delta) => {
		if (groupRef.current) {
			// Slow rotation for sunset ambiance
			groupRef.current.rotation.y += delta * .003;
		}
	});
	return /* @__PURE__ */ _jsxDEV("group", {
		ref: groupRef,
		position: [
			0,
			0,
			60
		],
		children: [
			/* @__PURE__ */ _jsxDEV("mesh", {
				receiveShadow: true,
				children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
					150,
					40,
					24,
					8
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1100,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#3A3A2A",
					roughness: .98,
					metalness: .01
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1101,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1099,
				columnNumber: 7
			}, this),
			Array.from({ length: 6 }).map((_, ringIndex) => /* @__PURE__ */ _jsxDEV(SunsetRing, { index: ringIndex }, ringIndex, false, {
				fileName: _jsxFileName,
				lineNumber: 1110,
				columnNumber: 9
			}, this)),
			/* @__PURE__ */ _jsxDEV("mesh", {
				receiveShadow: true,
				position: [
					0,
					-1,
					0
				],
				children: [/* @__PURE__ */ _jsxDEV("planeGeometry", { args: [
					100,
					100,
					16,
					16
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1115,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#3A3A2A",
					roughness: .9,
					metalness: .02
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1116,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1114,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1097,
		columnNumber: 5
	}, this);
}
_s9(ProjectsSunsetZone, "z+BGKNZSG9jHmNgDBB7SECNqnkU=", false, function() {
	return [useFrame];
});
_c22 = ProjectsSunsetZone;
function SunsetRing({ index }) {
	const progress = index / 5;
	const radius = 20 + progress * 60;
	const segments = 16 + Math.floor(progress * 16);
	const thickness = 1 + progress * 2;
	const height = .5;
	// Sunset color gradient: orange → warm yellow → pale orange (no magenta)
	let color = "#ff4500";
	if (progress > .4) {
		color = progress > .7 ? "#FFB74D" : "#FFCC80";
	}
	return /* @__PURE__ */ _jsxDEV("mesh", {
		position: [
			0,
			height,
			0
		],
		rotation: [
			Math.PI / 2,
			0,
			0
		],
		receiveShadow: true,
		children: [/* @__PURE__ */ _jsxDEV("ringGeometry", { args: [
			radius - thickness,
			radius,
			segments
		] }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1145,
			columnNumber: 7
		}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
			color,
			roughness: .7,
			metalness: .1,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: .6 - progress * .3
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1146,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1140,
		columnNumber: 5
	}, this);
}
_c23 = SunsetRing;
function SkillMarker({ stop }) {
	_s10();
	const [hovered, setHovered] = useState(false);
	const markerRef = useRef(null);
	useFrame(() => {
		if (markerRef.current) {
			// Gentle bobbing animation
			markerRef.current.position.y = 3 + Math.sin(Date.now() * .002 + stop.id.length) * .5;
			// Slow rotation
			markerRef.current.rotation.y += .01;
		}
	});
	const handleClick = () => {
		// Update overlay content
		const titleEl = document.getElementById("overlay-title");
		const bodyEl = document.getElementById("overlay-body");
		if (titleEl && bodyEl) {
			titleEl.textContent = stop.name;
			bodyEl.innerHTML = `
        <div className="skill-detail">
          <h3>${stop.name}</h3>
          <p>Cloud infrastructure and DevOps technology</p>
          <div className="skill-icon">☁️</div>
          <p className="hint">Navigate to next skill using WASD/Arrow Keys</p>
        </div>
      `;
		}
	};
	return /* @__PURE__ */ _jsxDEV(_Fragment, { children: [/* @__PURE__ */ _jsxDEV("mesh", {
		ref: markerRef,
		position: [
			stop.x,
			3,
			stop.z
		],
		scale: [
			1.2,
			1.2,
			1.2
		],
		onClick: handleClick,
		onPointerOver: () => setHovered(true),
		onPointerOut: () => setHovered(false),
		children: [/* @__PURE__ */ _jsxDEV("boxGeometry", { args: [
			1,
			1,
			1
		] }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1198,
			columnNumber: 9
		}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
			color: stop.side === "left" ? "#4a90e2" : "#e94a4a",
			roughness: .3,
			metalness: .6,
			emissive: hovered ? "#ffff00" : "#000000",
			emissiveIntensity: hovered ? .5 : 0
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1199,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1190,
		columnNumber: 7
	}, this), /* @__PURE__ */ _jsxDEV(Html, {
		position: [
			stop.x,
			5,
			stop.z
		],
		distanceFactor: 1.5,
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "skill-label",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "skill-label-content",
				children: stop.name
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1213,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1212,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1208,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1189,
		columnNumber: 5
	}, this);
}
_s10(SkillMarker, "LfcuGndM4As4WoH/aIFjo7Wz/9c=", false, function() {
	return [useFrame];
});
_c24 = SkillMarker;
function ProjectMarker({ project }) {
	_s11();
	const [hovered, setHovered] = useState(false);
	const markerRef = useRef(null);
	useFrame(() => {
		if (markerRef.current) {
			// Gentle floating animation
			markerRef.current.position.y = 4 + Math.sin(Date.now() * .0015 + project.id.length) * .8;
			// Slow rotation
			markerRef.current.rotation.y += .008;
		}
	});
	const handleClick = () => {
		// Update overlay content
		const titleEl = document.getElementById("overlay-title");
		const bodyEl = document.getElementById("overlay-body");
		if (titleEl && bodyEl) {
			titleEl.textContent = project.title;
			bodyEl.innerHTML = `
        <div className="project-detail">
          <h3>${project.title}</h3>
          <p>${project.technologies.slice(0, 4).join(", ")}</p>
          <a href="${project.github}" target="_blank" rel="noopener noreferrer" className="github-link">
            View on GitHub →
          </a>
        </div>
      `;
		}
	};
	return /* @__PURE__ */ _jsxDEV(_Fragment, { children: [/* @__PURE__ */ _jsxDEV("mesh", {
		ref: markerRef,
		position: [
			0,
			4,
			0
		],
		scale: [
			1.8,
			1.8,
			1.8
		],
		onClick: handleClick,
		onPointerOver: () => setHovered(true),
		onPointerOut: () => setHovered(false),
		children: [/* @__PURE__ */ _jsxDEV("boxGeometry", { args: [
			1,
			1,
			1
		] }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1261,
			columnNumber: 9
		}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
			color: "#ff8c00",
			roughness: .4,
			metalness: .5,
			emissive: hovered ? "#ffff00" : "#000000",
			emissiveIntensity: hovered ? .3 : 0
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1262,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1253,
		columnNumber: 7
	}, this), /* @__PURE__ */ _jsxDEV(Html, {
		position: [
			0,
			6,
			0
		],
		distanceFactor: 1.5,
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "project-label",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "project-label-content",
				children: project.title
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1276,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1275,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 1271,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1252,
		columnNumber: 5
	}, this);
}
_s11(ProjectMarker, "LfcuGndM4As4WoH/aIFjo7Wz/9c=", false, function() {
	return [useFrame];
});
_c25 = ProjectMarker;
function CloudCharacter() {
	_s12();
	const characterRef = useRef(null);
	const [position, setPosition] = useState({
		x: -20,
		y: 3,
		z: 0
	});
	const [velocity, setVelocity] = useState({
		x: 0,
		z: 0
	});
	const keysRef = useRef({});
	const [targetSkillIndex, setTargetSkillIndex] = useState(0);
	useEffect(() => {
		const handleKeyDown = (e) => {
			keysRef.current[e.key.toLowerCase()] = true;
		};
		const handleKeyUp = (e) => {
			keysRef.current[e.key.toLowerCase()] = false;
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);
	useFrame((_, delta) => {
		if (!characterRef.current) return;
		const speed = 6;
		const friction = .88;
		let vx = 0;
		let vz = 0;
		// Movement constraints - prevent going too far off path
		const maxX = 25;
		const maxZ = 80;
		if (keysRef.current["w"] || keysRef.current["arrowup"]) vz -= 1;
		if (keysRef.current["s"] || keysRef.current["arrowdown"]) vz += 1;
		if (keysRef.current["a"] || keysRef.current["arrowleft"]) vx -= 1;
		if (keysRef.current["d"] || keysRef.current["arrowright"]) vx += 1;
		const len = Math.hypot(vx, vz);
		if (len > 0) {
			vx /= len;
			vz /= len;
		}
		setVelocity((prev) => ({
			x: prev.x * friction + vx * speed * delta,
			z: prev.z * friction + vz * speed * delta
		}));
		setPosition((prev) => {
			const newX = THREE.MathUtils.clamp(prev.x + velocity.x * delta, -maxX, maxX);
			const newZ = THREE.MathUtils.clamp(prev.z + velocity.z * delta, -5, maxZ);
			return {
				...prev,
				x: newX,
				z: newZ
			};
		});
		// Auto-progress toward next skill when close
		const targetSkill = SKILL_STOPS[targetSkillIndex];
		if (targetSkill) {
			const distanceToTarget = Math.hypot(position.x - targetSkill.x, position.z - targetSkill.z);
			if (distanceToTarget < 3 && targetSkillIndex < SKILL_STOPS.length - 1) {
				setTargetSkillIndex((prev) => prev + 1);
			}
		}
		if (characterRef.current) {
			characterRef.current.position.lerp(new THREE.Vector3(position.x, position.y, position.z), .08);
			if (velocity.x !== 0 || velocity.z !== 0) {
				const targetRotation = Math.atan2(velocity.x, velocity.z);
				characterRef.current.rotation.y = THREE.MathUtils.lerp(characterRef.current.rotation.y, targetRotation, .08);
			}
		}
	});
	return /* @__PURE__ */ _jsxDEV("group", {
		ref: characterRef,
		position: [
			position.x,
			position.y,
			position.z
		],
		children: [
			/* @__PURE__ */ _jsxDEV("mesh", {
				castShadow: true,
				children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
					1.4,
					14,
					10
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1373,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#ffffff",
					roughness: .3,
					metalness: .1,
					transparent: true,
					opacity: .92
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1374,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1372,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("mesh", {
				castShadow: true,
				position: [
					0,
					1.2,
					0
				],
				scale: [
					1.1,
					.9,
					1.1
				],
				children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
					1,
					12,
					8
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1384,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", {
					color: "#ffffff",
					roughness: .3,
					metalness: .1,
					transparent: true,
					opacity: .9
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1385,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1383,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("mesh", {
				castShadow: true,
				position: [
					-.3,
					1.5,
					.6
				],
				scale: [
					.15,
					.15,
					.15
				],
				children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
					1,
					8,
					6
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1395,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", { color: "#000000" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1396,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1394,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ _jsxDEV("mesh", {
				castShadow: true,
				position: [
					.3,
					1.5,
					.6
				],
				scale: [
					.15,
					.15,
					.15
				],
				children: [/* @__PURE__ */ _jsxDEV("sphereGeometry", { args: [
					1,
					8,
					6
				] }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1399,
					columnNumber: 9
				}, this), /* @__PURE__ */ _jsxDEV("meshStandardMaterial", { color: "#000000" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1400,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1398,
				columnNumber: 7
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1370,
		columnNumber: 5
	}, this);
}
_s12(CloudCharacter, "6Rp+00xm7+mrPCOHqBSLjX/JPos=", false, function() {
	return [useFrame];
});
_c26 = CloudCharacter;
export default CloudWorld3D;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17, _c18, _c19, _c20, _c21, _c22, _c23, _c24, _c25, _c26;
$RefreshReg$(_c, "FrameDriver");
$RefreshReg$(_c2, "CloudWorld3D");
$RefreshReg$(_c3, "SunsetSkySphere");
$RefreshReg$(_c4, "SkillsValleyZone");
$RefreshReg$(_c5, "InstancedClouds");
$RefreshReg$(_c6, "DistantMountains");
$RefreshReg$(_c7, "ValleyFloor");
$RefreshReg$(_c8, "GrassPatch");
$RefreshReg$(_c9, "ValleyRock");
$RefreshReg$(_c10, "ValleyHill");
$RefreshReg$(_c11, "PineTree");
$RefreshReg$(_c12, "LeftCliffWall");
$RefreshReg$(_c13, "RightCliffWall");
$RefreshReg$(_c14, "CliffRock");
$RefreshReg$(_c15, "MountainPassageZone");
$RefreshReg$(_c16, "PassageFloor");
$RefreshReg$(_c17, "PassageDebris");
$RefreshReg$(_c18, "PassageCeiling");
$RefreshReg$(_c19, "PassageRock");
$RefreshReg$(_c20, "PassagePine");
$RefreshReg$(_c21, "PassageFog");
$RefreshReg$(_c22, "ProjectsSunsetZone");
$RefreshReg$(_c23, "SunsetRing");
$RefreshReg$(_c24, "SkillMarker");
$RefreshReg$(_c25, "ProjectMarker");
$RefreshReg$(_c26, "CloudCharacter");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/src/cloud-world-3d/CloudWorld3D.tsx?t=1791716006152";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("D:/Yash/personal-website/src/cloud-world-3d/CloudWorld3D.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("D:/Yash/personal-website/src/cloud-world-3d/CloudWorld3D.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "D:/Yash/personal-website/src/cloud-world-3d/CloudWorld3D.tsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,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QUFJLE1BQU0sUUFBUSxHQUFHLEtBQUssR0FBRztNQUFHLFVBQVUsSUFBSSxNQUFNLE1BQU0sR0FBRyxDQUFDLElBQUssQ0FBQztLQUFFO0tBQ3JHO01BQUUsR0FBRztNQUFJLEdBQUc7TUFBTSxHQUFHLENBQUM7TUFBSSxPQUFPLElBQUksTUFBTSxRQUFRLEtBQUssR0FBRyxHQUFHO01BQUcsVUFBVSxJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUssQ0FBQztLQUFFO0lBQ3hHO0lBQ0EsVUFBVTtLQUFFLE9BQU87S0FBVyxTQUFTO0lBQUk7R0FDN0M7OztHQUVBO0lBQ0UsT0FBTztLQUNMO01BQUUsR0FBRztNQUFHLEdBQUc7TUFBSSxHQUFHO01BQUcsT0FBTyxJQUFJLE1BQU0sUUFBUSxLQUFLLEdBQUcsR0FBRztNQUFHLFVBQVUsSUFBSSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUM7S0FBRTtLQUMvRjtNQUFFLEdBQUc7TUFBRyxHQUFHO01BQUksR0FBRztNQUFHLE9BQU8sSUFBSSxNQUFNLFFBQVEsR0FBRyxLQUFLLEdBQUc7TUFBRyxVQUFVLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSyxDQUFDO0tBQUU7S0FDakc7TUFBRSxHQUFHLENBQUM7TUFBRyxHQUFHO01BQU0sR0FBRztNQUFHLE9BQU8sSUFBSSxNQUFNLFFBQVEsR0FBRyxLQUFLLEdBQUc7TUFBRyxVQUFVLElBQUksTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFLLENBQUM7S0FBRTtJQUN2RztJQUNBLFVBQVU7S0FBRSxPQUFPO0tBQVcsU0FBUztJQUFLO0dBQzlDOzs7R0FFQTtJQUNFLE9BQU87S0FDTDtNQUFFLEdBQUcsQ0FBQztNQUFJLEdBQUc7TUFBSSxHQUFHO01BQUksT0FBTyxJQUFJLE1BQU0sUUFBUSxLQUFLLEdBQUcsQ0FBQztNQUFHLFVBQVUsSUFBSSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUM7S0FBRTtLQUNoRztNQUFFLEdBQUcsQ0FBQztNQUFJLEdBQUc7TUFBSSxHQUFHO01BQUksT0FBTyxJQUFJLE1BQU0sUUFBUSxHQUFH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S0FBRztLQUFHO0lBQUMsRUFBSTs7OztjQUNsQyx3QkFBQyx3QkFBRCxFQUFzQixPQUFNLFVBQVc7Ozs7WUFDbkM7Ozs7OztFQUNEOzs7Ozs7QUFFWDs7Ozs7QUFFQSxlQUFlIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIkNsb3VkV29ybGQzRC50c3giXSwidmVyc2lvbiI6Mywic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlLCB1c2VNZW1vIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQ2FudmFzLCB1c2VGcmFtZSwgdXNlVGhyZWUgfSBmcm9tICdAcmVhY3QtdGhyZWUvZmliZXInO1xuaW1wb3J0IHsgT3JiaXRDb250cm9scywgSHRtbCB9IGZyb20gJ0ByZWFjdC10aHJlZS9kcmVpJztcbmltcG9ydCB7IEVmZmVjdENvbXBvc2VyLCBFZmZlY3RHcm91cCB9IGZyb20gJ0ByZWFjdC10aHJlZS9wb3N0cHJvY2Vzc2luZyc7XG5pbXBvcnQgeyBWaWduZXR0ZSwgTm9pc2UgfSBmcm9tICdAcmVhY3QtdGhyZWUvcG9zdHByb2Nlc3NpbmcnO1xuaW1wb3J0IHsgRWZmZWN0Q29tcG9zZXIgYXMgRWZmZWN0Q29tcG9zZXJUeXBlIH0gZnJvbSAncG9zdHByb2Nlc3NpbmcnO1xuaW1wb3J0ICogYXMgVEhSRUUgZnJvbSAndGhyZWUnO1xuaW1wb3J0ICcuL0Nsb3VkV29ybGQzRC5jc3MnO1xuXG4vLyBNb2R1bGUtbGV2ZWwgZmxhZyB0byBwcmV2ZW50IGR1cGxpY2F0ZSBGcmFtZURyaXZlciBsb29wcyBpbiBSZWFjdC5TdHJpY3RNb2RlXG5sZXQgZnJhbWVEcml2ZXJSdW5uaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIEZyYW1lRHJpdmVyKHsgY29tcG9zZXJSZWYgfTogeyBjb21wb3NlclJlZjogUmVhY3QuUmVmT2JqZWN0PEVmZmVjdENvbXBvc2VyVHlwZSB8IG51bGw+IH0pIHtcbiAgY29uc3QgeyBnbCwgYWR2YW5jZSB9ID0gdXNlVGhyZWUoKTtcbiAgY29uc3QgZnJhbWVJZFJlZiA9IHVzZVJlZjxudW1iZXIgfCBudWxsPihudWxsKTtcbiAgY29uc3QgbGFzdFRpbWVSZWYgPSB1c2VSZWYocGVyZm9ybWFuY2Uubm93KCkpO1xuICBjb25zdCBjb21wb3NlclJlYWR5UmVmID0gdXNlUmVmKGZhbHNlKTtcbiAgXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gUHJldmVudCBtdWx0aXBsZSBsb29wcyAtIHVzZSBtb2R1bGUtbGV2ZWwgZmxhZ1xuICAgIGlmIChmcmFtZURyaXZlclJ1bm5pbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbRnJhbWVEcml2ZXJdIExvb3AgYWxyZWFkeSBydW5uaW5nIChtb2R1bGUtbGV2ZWwpLCBza2lwcGluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmcmFtZURyaXZlclJ1bm5pbmcgPSB0cnVlO1xuICAgIFxuICAgIGNvbnNvbGUubG9nKCdbRnJhbWVEcml2ZXJdIEVmZmVjdCBzdGFydGVkJyk7XG4gICAgLy8gTWFudWFsIHJlbmRlciBsb29wIGZvciBmcmFtZWxvb3A9XCJuZXZlclwiXG4gICAgbGV0IGZyYW1lQ291bnQgPSAwO1xuICAgIFxuICAgIGNvbnN0IGxvb3AgPSAodGltZTogbnVtYmVyKSA9PiB7XG4gICAgICBmcmFtZUlkUmVmLmN1cnJlbnQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG4gICAgICBmcmFtZUNvdW50Kys7XG4gICAgICBcbiAgICAgIGNvbnN0IGRlbHRhID0gKHRpbWUgLSBsYXN0VGltZVJlZi5jdXJyZW50KSAvIDEwMDA7XG4gICAgICBsYXN0VGltZVJlZi5jdXJyZW50ID0gdGltZTtcbiAgICAgIFxuICAgICAgLy8gQWR2YW5jZSBSM0Ygc3RhdGUgKGNsb2NrLCBldGMuKVxuICAgICAgYWR2YW5jZSh0aW1lLCB0cnVlKTtcbiAgICAgIFxuICAgICAgLy8gUmVuZGVyIHZpYSBFZmZlY3RDb21wb3NlciAtIHdhaXQgZm9yIGNvbXBvc2VyIHRvIGJlIHJlYWR5XG4gICAgICBpZiAoY29tcG9zZXJSZWYuY3VycmVudCAmJiAhY29tcG9zZXJSZWFkeVJlZi5jdXJyZW50KSB7XG4gICAgICAgIGNvbXBvc2VyUmVhZHlSZWYuY3VycmVudCA9IHRydWU7XG4gICAgICAgIGNvbnN0IGNvbXBvc2VyID0gY29tcG9zZXJSZWYuY3VycmVudDtcbiAgICAgICAgY29uc29sZS5sb2coJ1tGcmFtZURyaXZlcl0gQ29tcG9zZXIgZm91bmQsIHJlbmRlcmluZy4uLicsIHsgXG4gICAgICAgICAgY29tcG9zZXJUeXBlOiBjb21wb3Nlci5jb25zdHJ1Y3Rvcj8ubmFtZSxcbiAgICAgICAgICBwYXNzZXM6IGNvbXBvc2VyLnBhc3Nlcz8ubGVuZ3RoLFxuICAgICAgICAgIGF1dG9SZW5kZXJUb1NjcmVlbjogY29tcG9zZXIuYXV0b1JlbmRlclRvU2NyZWVuLFxuICAgICAgICAgIGlucHV0QnVmZmVyOiBjb21wb3Nlci5pbnB1dEJ1ZmZlciA/ICd5ZXMnIDogJ25vJyxcbiAgICAgICAgICBvdXRwdXRCdWZmZXI6IGNvbXBvc2VyLm91dHB1dEJ1ZmZlciA/ICd5ZXMnIDogJ25vJyxcbiAgICAgICAgICBwYXNzRGV0YWlsczogY29tcG9zZXIucGFzc2VzPy5tYXAoKHAsIGkpID0+ICh7XG4gICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgIHR5cGU6IHAuY29uc3RydWN0b3I/Lm5hbWUsXG4gICAgICAgICAgICBlbmFibGVkOiBwLmVuYWJsZWQsXG4gICAgICAgICAgfSkpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoY29tcG9zZXJSZWFkeVJlZi5jdXJyZW50ICYmIGNvbXBvc2VyUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgLy8gTGV0IGNvbXBvc2VyIGhhbmRsZSBhdXRvQ2xlYXIgYW5kIHJlbmRlciB0byBzY3JlZW5cbiAgICAgICAgY29tcG9zZXJSZWYuY3VycmVudC5yZW5kZXIoZGVsdGEpO1xuICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgZnJhbWVJZFJlZi5jdXJyZW50ID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApO1xuICAgIFxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnW0ZyYW1lRHJpdmVyXSBDbGVhbnVwLCBmcmFtZXMgcmVuZGVyZWQ6JywgZnJhbWVDb3VudCk7XG4gICAgICBpZiAoZnJhbWVJZFJlZi5jdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lSWRSZWYuY3VycmVudCk7XG4gICAgICAgIGZyYW1lSWRSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9XG4gICAgICBmcmFtZURyaXZlclJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgIGNvbXBvc2VyUmVhZHlSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgIH07XG4gIH0sIFtnbCwgYWR2YW5jZV0pO1xuICBcbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIFNraWxsIHN0b3BzIGRhdGEgZnJvbSBwcm9qZWN0cy5kYXRhLnRzXG5jb25zdCBTS0lMTF9TVE9QUyA9IFtcbiAgeyBpZDogJ2F3cycsIG5hbWU6ICdBV1MnLCB4OiAtNCwgejogLTIwLCBzaWRlOiAnbGVmdCcgfSxcbiAgeyBpZDogJ3RlcnJhZm9ybScsIG5hbWU6ICdUZXJyYWZvcm0nLCB4OiA0LCB6OiAtMjAsIHNpZGU6ICdyaWdodCcgfSxcbiAgeyBpZDogJ2RvY2tlcicsIG5hbWU6ICdEb2NrZXInLCB4OiAtNCwgejogMTAsIHNpZGU6ICdsZWZ0JyB9LFxuICB7IGlkOiAna3ViZXJuZXRlcycsIG5hbWU6ICdLdWJlcm5ldGVzJywgeDogNCwgejogMTAsIHNpZGU6ICdyaWdodCcgfSxcbiAgeyBpZDogJ2xpbnV4JywgbmFtZTogJ0xpbnV4JywgeDogLTQsIHo6IDQwLCBzaWRlOiAnbGVmdCcgfSxcbiAgeyBpZDogJ2dpdCcsIG5hbWU6ICdHaXQnLCB4OiA0LCB6OiA0MCwgc2lkZTogJ3JpZ2h0JyB9LFxuICB7IGlkOiAnY2ljZCcsIG5hbWU6ICdDSS9DRCcsIHg6IC00LCB6OiA3MCwgc2lkZTogJ2xlZnQnIH1cbl07XG5cbi8vIFByb2plY3QgZGF0YSBmcm9tIHByb2plY3RzLmRhdGEudHNcbmNvbnN0IFBST0pFQ1RfREFUQSA9IFtcbiAge1xuICAgIGlkOiAnbmlmdHkxMDAtZmluYW5jaWFsLWFuYWx5c2lzJyxcbiAgICB0aXRsZTogJ05pZnR5LTEwMCBGaW5hbmNpYWwgQW5hbHlzaXMnLFxuICAgIGdpdGh1YjogJ2h0dHBzOi8vZ2l0aHViLmNvbS95YXNobWFoYWphbjExMjM0NTY3L0JsdWVzdG9ja19maW50ZWNoJyxcbiAgICB0ZWNobm9sb2dpZXM6IFsnUHl0aG9uJywgJ3BhbmRhcycsICdTUUxpdGUnLCAnVC1TUUwnLCAnRmFzdEFQSScsICdTdHJlYW1saXQnXVxuICB9LFxuICB7XG4gICAgaWQ6ICdzcWwtZGF0YS13YXJlaG91c2UnLFxuICAgIHRpdGxlOiAnU1FMIERhdGEgV2FyZWhvdXNlICYgRVRMJyxcbiAgICBnaXRodWI6ICdodHRwczovL2dpdGh1Yi5jb20veWFzaG1haGFqYW4xMTIzNDU2Ny9TcWwtZGF0YS13YXJlaG91c2UnLFxuICAgIHRlY2hub2xvZ2llczogWydULVNRTCcsICdTUUwgU2VydmVyJywgJ0JVTEsgSU5TRVJUJywgJ1dpbmRvdyBGdW5jdGlvbnMnLCAnU3RhciBTY2hlbWEnXVxuICB9LFxuICB7XG4gICAgaWQ6ICdwcmltZXRyYWRlYWknLFxuICAgIHRpdGxlOiAnUFJJTUVUcmFkZUFJJyxcbiAgICBnaXRodWI6ICdodHRwczovL2dpdGh1Yi5jb20veWFzaG1haGFqYW4xMTIzNDU2Ny9QUklNRVRyYWRlQUknLFxuICAgIHRlY2hub2xvZ2llczogWydULVNRTCcsICdQeXRob24nLCAncGFuZGFzJywgJ3NjaWtpdC1sZWFybicsICdSYW5kb20gRm9yZXN0JywgJ0tNZWFucycsICdTdHJlYW1saXQnXVxuICB9LFxuICB7XG4gICAgaWQ6ICdkYXRhLWFuYWx5dGljcy1kYXNoYm9hcmRzJyxcbiAgICB0aXRsZTogJ0RhdGEgQW5hbHl0aWNzIERhc2hib2FyZHMnLFxuICAgIGdpdGh1YjogJ2h0dHBzOi8vZ2l0aHViLmNvbS95YXNobWFoYWphbjExMjM0NTY3L1Byb2plY3RzL3RyZWUvbWFpbi9EYXRhLUFuYWx5dGljcy1Qcm9qZWN0cycsXG4gICAgdGVjaG5vbG9naWVzOiBbJ0V4Y2VsJywgJ1RhYmxlYXUnLCAnUG93ZXIgQkknXVxuICB9XG5dO1xuXG5pbnRlcmZhY2UgQ2xvdWRXb3JsZDNEUHJvcHMge1xuICBvbkV4aXQ6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjb25zdCBDbG91ZFdvcmxkM0QgPSAoeyBvbkV4aXQgfTogQ2xvdWRXb3JsZDNEUHJvcHMpID0+IHtcbiAgY29uc3QgW3JlZHVjZWRNb3Rpb24sIHNldFJlZHVjZWRNb3Rpb25dID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbd2ViZ2xBdmFpbGFibGUsIHNldFdlYmdsQXZhaWxhYmxlXSA9IHVzZVN0YXRlKHRydWUpO1xuICBjb25zdCBjb250YWluZXJSZWYgPSB1c2VSZWY8SFRNTERpdkVsZW1lbnQ+KG51bGwpO1xuICBjb25zdCBjb21wb3NlclJlZiA9IHVzZVJlZjxFZmZlY3RDb21wb3NlclR5cGU+KG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgbWVkaWFRdWVyeSA9IHdpbmRvdy5tYXRjaE1lZGlhKCcocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKScpO1xuICAgIHNldFJlZHVjZWRNb3Rpb24obWVkaWFRdWVyeS5tYXRjaGVzKTtcbiAgICBjb25zdCBoYW5kbGVyID0gKGU6IE1lZGlhUXVlcnlMaXN0RXZlbnQpID0+IHNldFJlZHVjZWRNb3Rpb24oZS5tYXRjaGVzKTtcbiAgICBtZWRpYVF1ZXJ5LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGhhbmRsZXIpO1xuICAgIHJldHVybiAoKSA9PiBtZWRpYVF1ZXJ5LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGhhbmRsZXIpO1xuICB9LCBbXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dCgnd2ViZ2wyJykgfHwgY2FudmFzLmdldENvbnRleHQoJ3dlYmdsJyk7XG4gICAgICBzZXRXZWJnbEF2YWlsYWJsZSghIWdsKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHNldFdlYmdsQXZhaWxhYmxlKGZhbHNlKTtcbiAgICB9XG4gIH0sIFtdKTtcblxuICBjb25zdCBoYW5kbGVLZXlEb3duID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICBvbkV4aXQoKTtcbiAgICB9XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleURvd24pO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleURvd24pO1xuICB9LCBbb25FeGl0XSk7XG5cbiAgaWYgKCF3ZWJnbEF2YWlsYWJsZSkge1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImNsb3VkLXdvcmxkLWZhbGxiYWNrXCIgcm9sZT1cInJlZ2lvblwiIGFyaWEtbGFiZWw9XCJDbG91ZCBXb3JsZCAtIFdlYkdMIG5vdCBhdmFpbGFibGVcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmYWxsYmFjay1jb250ZW50XCI+XG4gICAgICAgICAgPGgxPkNsb3VkIFdvcmxkPC9oMT5cbiAgICAgICAgICA8cD5Zb3VyIGJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IFdlYkdMLCB3aGljaCBpcyByZXF1aXJlZCBmb3IgdGhlIDNEIGV4cGVyaWVuY2UuPC9wPlxuICAgICAgICAgIDxidXR0b24gb25DbGljaz17b25FeGl0fSBjbGFzc05hbWU9XCJleGl0LWJ1dHRvblwiPlJldHVybiB0byBQb3J0Zm9saW88L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgaWYgKHJlZHVjZWRNb3Rpb24pIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJjbG91ZC13b3JsZC1yZWR1Y2VkXCIgcm9sZT1cInJlZ2lvblwiIGFyaWEtbGFiZWw9XCJDbG91ZCBXb3JsZCAtIFJlZHVjZWQgbW90aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVkdWNlZC1jb250ZW50XCI+XG4gICAgICAgICAgPGgxPkNsb3VkIFdvcmxkPC9oMT5cbiAgICAgICAgICA8cD5SZWR1Y2VkIG1vdGlvbiBpcyBlbmFibGVkLiBUaGUgM0QgZXhwZXJpZW5jZSBpcyBkaXNhYmxlZCBmb3IgY29tZm9ydC48L3A+XG4gICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbkV4aXR9IGNsYXNzTmFtZT1cImV4aXQtYnV0dG9uXCI+UmV0dXJuIHRvIFBvcnRmb2xpbzwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiY2xvdWQtd29ybGQtY29udGFpbmVyXCIgcmVmPXtjb250YWluZXJSZWZ9PlxuICAgICAgPENhbnZhc1xuICAgICAgICBjYW1lcmE9e3sgcG9zaXRpb246IFswLCA4LCAyNV0sIGZvdjogNTAsIG5lYXI6IDAuMSwgZmFyOiAyMDAwMCB9fVxuICAgICAgICBvbkNyZWF0ZWQ9eyh7IGdsIH0pID0+IHtcbiAgICAgICAgICBnbC5zZXRQaXhlbFJhdGlvKE1hdGgubWluKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvLCAyKSk7XG4gICAgICAgIH19XG4gICAgICAgIHN0eWxlPXt7IHRvdWNoQWN0aW9uOiAnbm9uZScgfX1cbiAgICAgICAgZ2w9e3sgcHJlc2VydmVEcmF3aW5nQnVmZmVyOiB0cnVlLCBhbnRpYWxpYXM6IHRydWUsIGFscGhhOiBmYWxzZSwgc3RlbmNpbDogdHJ1ZSwgZGVwdGg6IHRydWUsIHBvd2VyUHJlZmVyZW5jZTogJ2hpZ2gtcGVyZm9ybWFuY2UnIH19XG4gICAgICAgIGZyYW1lbG9vcD1cIm5ldmVyXCJcbiAgICAgID5cbiAgICAgICAgey8qIFN1bnNldCBza3kgZ3JhZGllbnQgLSBzaGFkZXItYmFzZWQgc3BoZXJlIGF0IG9yaWdpbiwgcmVuZGVycyBmaXJzdCwgZnJ1c3R1bUN1bGxlZCBmYWxzZSB0byBwcmV2ZW50IGZhci1wbGFuZSBjbGlwcGluZyAqL31cbiAgICAgICAgPFN1bnNldFNreVNwaGVyZSAvPlxuICAgICAgICB7LyogTm8gc2NlbmUgZm9nIC0gc2t5IHNwaGVyZSBoYW5kbGVzIGF0bW9zcGhlcmljIGRlcHRoOyBmb2cgd2FzIGNvbG9yaW5nIHRoZSBza3kgc3BoZXJlICovfVxuICAgICAgICB7LyogV2FybSBnb2xkZW4taG91ciBsaWdodGluZyAtIHdhcm1lciBncm91bmQgY29sb3IgZm9yIHN1bnNldCBmZWVsICovfVxuICAgICAgICA8aGVtaXNwaGVyZUxpZ2h0IGludGVuc2l0eT17MC43fSBncm91bmRDb2xvcj1cIiNDOEE4NzhcIiBjb2xvcj1cIiNGRkU4QzBcIiAvPlxuICAgICAgICAgICAgICA8ZGlyZWN0aW9uYWxMaWdodCBwb3NpdGlvbj17WzI1LCA1MCwgLTIwXX0gaW50ZW5zaXR5PXsxLjZ9IGNhc3RTaGFkb3c+XG4gICAgICAgICAgICAgICAgPG9ydGhvZ3JhcGhpY0NhbWVyYVxuICAgICAgICAgICAgICAgICAgYXR0YWNoPVwic2hhZG93Q2FtZXJhXCJcbiAgICAgICAgICAgICAgICAgIGFyZ3M9e1stNTAsIDUwLCA1MCwgLTUwLCAwLjEsIDE1MF19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPC9kaXJlY3Rpb25hbExpZ2h0PlxuXG4gICAgICAgICAgICAgIHsvKiBFbnZpcm9ubWVudCByZW1vdmVkIC0gaXQgd2FzIGNhdXNpbmcgZ3JlZW4gZ3JhZGllbnQgd2hlbiBsb29raW5nIHVwIGFuZCBvYnNjdXJpbmcgc2t5IHNwaGVyZSAqL31cblxuICAgICAgICAgICAgICB7LyogVGhyZWUtem9uZSBsYW5kc2NhcGUgKi99XG4gICAgICAgICAgICAgIDxTa2lsbHNWYWxsZXlab25lIC8+XG4gICAgICAgICAgICAgIDxNb3VudGFpblBhc3NhZ2Vab25lIC8+XG4gICAgICAgICAgICAgIDxQcm9qZWN0c1N1bnNldFpvbmUgLz5cblxuICAgICAgICB7LyogU2tpbGwgYW5kIHByb2plY3QgbWFya2VycyAqL31cbiAgICAgICAge1NLSUxMX1NUT1BTLm1hcChzdG9wID0+IChcbiAgICAgICAgICA8U2tpbGxNYXJrZXIga2V5PXtzdG9wLmlkfSBzdG9wPXtzdG9wfSAvPlxuICAgICAgICApKX1cbiAgICAgICAge1BST0pFQ1RfREFUQS5tYXAocHJvamVjdCA9PiAoXG4gICAgICAgICAgPFByb2plY3RNYXJrZXIga2V5PXtwcm9qZWN0LmlkfSBwcm9qZWN0PXtwcm9qZWN0fSAvPlxuICAgICAgICApKX1cblxuICAgICAgICA8Q2xvdWRDaGFyYWN0ZXIgLz5cblxuICAgICAgICB7LyogQ29uc3RyYWluZWQgT3JiaXRDb250cm9scyAtIGxpbWl0ZWQgcm90YXRpb24gdG8gcHJldmVudCBicmVha2luZyB0aGUgam91cm5leSAqL31cbiAgICAgICAgPE9yYml0Q29udHJvbHNcbiAgICAgICAgICBlbmFibGVQYW49e2ZhbHNlfVxuICAgICAgICAgIGVuYWJsZVpvb209e3RydWV9XG4gICAgICAgICAgZW5hYmxlUm90YXRlPXt0cnVlfVxuICAgICAgICAgIG1pbkRpc3RhbmNlPXsxNX1cbiAgICAgICAgICBtYXhEaXN0YW5jZT17NDB9XG4gICAgICAgICAgbWluUG9sYXJBbmdsZT17TWF0aC5QSSAqIDAuMn1cbiAgICAgICAgICBtYXhQb2xhckFuZ2xlPXtNYXRoLlBJICogMC44fVxuICAgICAgICAgIHRhcmdldD17WzAsIDgsIDBdfVxuICAgICAgICAgIGVuYWJsZURhbXBpbmc9e3RydWV9XG4gICAgICAgICAgZGFtcGluZ0ZhY3Rvcj17MC4wNX1cbiAgICAgICAgICByb3RhdGVTcGVlZD17MC41fVxuICAgICAgICAgIHpvb21TcGVlZD17MC41fVxuICAgICAgICAvPlxuXG4gICAgICAgIHsvKiBGcmFtZSBkcml2ZXIgZm9yIGZyYW1lbG9vcD1cIm5ldmVyXCIgKi99XG4gICAgICAgIDxGcmFtZURyaXZlciBjb21wb3NlclJlZj17Y29tcG9zZXJSZWZ9IC8+XG5cbiAgICAgICAgey8qIFBvc3QtcHJvY2Vzc2luZyBlZmZlY3RzICovfVxuICAgICAgICA8RWZmZWN0Q29tcG9zZXJcbiAgICAgICAgICAgICAgICAgIHJlZj17Y29tcG9zZXJSZWZ9XG4gICAgICAgICAgICAgICAgICBtdWx0aXNhbXBsaW5nPXswfVxuICAgICAgICAgICAgICAgICAgYXV0b1JlbmRlclRvU2NyZWVuXG4gICAgICAgICAgICAgICAgICByZW5kZXJQcmlvcml0eT17MX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8RWZmZWN0R3JvdXA+XG4gICAgICAgICAgICAgICAgICAgIDxOb2lzZSBvcGFjaXR5PXswLjAxNX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPFZpZ25ldHRlIG9mZnNldD17MC4zNX0gZGFya25lc3M9ezAuNH0gZXNraWw9e2ZhbHNlfSAvPlxuICAgICAgICAgICAgICAgICAgPC9FZmZlY3RHcm91cD5cbiAgICAgICAgICAgICAgICA8L0VmZmVjdENvbXBvc2VyPlxuICAgICAgPC9DYW52YXM+XG5cbiAgICAgIHsvKiBJbnRlcmFjdGl2ZSBvdmVybGF5IGZvciBza2lsbC9wcm9qZWN0IGRldGFpbHMgLSByZWd1bGFyIFJlYWN0IG92ZXJsYXksIE5PVCBkcmVpJ3MgSHRtbCAqL31cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY2xvdWQtd29ybGQtb3ZlcmxheVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm92ZXJsYXktY29udGVudFwiPlxuICAgICAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwib3ZlcmxheS1oZWFkZXJcIj5cbiAgICAgICAgICAgIDxoMiBpZD1cIm92ZXJsYXktdGl0bGVcIj5DbG91ZCBXb3JsZDwvaDI+XG4gICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uRXhpdH0gY2xhc3NOYW1lPVwiZXhpdC1idXR0b25cIiBhcmlhLWxhYmVsPVwiRXhpdCBDbG91ZCBXb3JsZFwiPsOXPC9idXR0b24+XG4gICAgICAgICAgPC9oZWFkZXI+XG4gICAgICAgICAgPG1haW4gY2xhc3NOYW1lPVwib3ZlcmxheS1tYWluXCI+XG4gICAgICAgICAgICA8ZGl2IGlkPVwib3ZlcmxheS1ib2R5XCI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInBsYWNlaG9sZGVyLXRleHRcIj5cbiAgICAgICAgICAgICAgICBKb3VybmV5IHRocm91Z2ggU2tpbGxzIFZhbGxleSDihpIgTW91bnRhaW4gUGFzc2FnZSDihpIgUHJvamVjdHMgU3Vuc2V0XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJqb3VybmV5LWhpbnRcIj5cbiAgICAgICAgICAgICAgICA8a2JkPldBU0Q8L2tiZD4gLyA8a2JkPkFycm93IEtleXM8L2tiZD4gTW92ZSBDaGFyYWN0ZXIgJm5ic3A7XG4gICAgICAgICAgICAgICAgPGtiZD5Nb3VzZTwva2JkPiBMb29rIEFyb3VuZCAmbmJzcDtcbiAgICAgICAgICAgICAgICA8a2JkPkNsaWNrPC9rYmQ+IG9uIG1hcmtlcnMgZm9yIGRldGFpbHMgJm5ic3A7XG4gICAgICAgICAgICAgICAgPGtiZD5Fc2M8L2tiZD4gRXhpdFxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvbWFpbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmZ1bmN0aW9uIFN1bnNldFNreVNwaGVyZSgpIHtcbiAgLy8gU2hhZGVyLWJhc2VkIHNreSBncmFkaWVudCBtYXRjaGluZyBza2lsbHMtdmFsbGV5LnBuZyByZWZlcmVuY2VcbiAgLy8gWmVuaXRoIChsb29raW5nIHVwKTogI0ZGQjc0RCAoZGVlcCBvcmFuZ2UpXG4gIC8vIEhvcml6b246ICNGRkNDODAgKHBhbGUgb3JhbmdlKVxuICAvLyBOYWRpciAobG9va2luZyBkb3duKTogI0ZGQjc0RCAoZGVlcCBvcmFuZ2UsIG1pcnJvcnMgemVuaXRoKVxuICAvLyBVc2luZyBjYW52YXMtZ2VuZXJhdGVkIGdyYWRpZW50IHRleHR1cmUgb24gQmFja1NpZGUgc3BoZXJlXG4gIFxuICBjb25zdCBncmFkaWVudFRleHR1cmUgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICBjYW52YXMud2lkdGggPSAyNTY7XG4gICAgY2FudmFzLmhlaWdodCA9IDI1NjtcbiAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBpZiAoIWN0eCkgcmV0dXJuIG5ldyBUSFJFRS5UZXh0dXJlKCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHZlcnRpY2FsIGdyYWRpZW50IG1hdGNoaW5nIFRocmVlLmpzIFVWIGNvb3JkaW5hdGVzXG4gICAgLy8gVGhyZWUuanMgVVYgc3BoZXJlOiBWPTEgYXQgemVuaXRoICgrWSksIFY9MC41IGF0IGhvcml6b24sIFY9MCBhdCBuYWRpciAoLVkpXG4gICAgLy8gQ2FudmFzIHk9MCAodG9wKSA9IFY9MSAoemVuaXRoKSwgQ2FudmFzIHk9MjU2IChib3R0b20pID0gVj0wIChuYWRpcilcbiAgICBjb25zdCBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCBjYW52YXMuaGVpZ2h0KTtcbiAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCAnI0ZGQjc0RCcpOyAgIC8vIFY9MTogemVuaXRoICh0b3ApXG4gICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuNSwgJyNGRkNDODAnKTsgICAvLyBWPTAuNTogaG9yaXpvbiAobWlkZGxlKVxuICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsICcjRkZCNzREJyk7ICAgLy8gVj0wOiBuYWRpciAoYm90dG9tKVxuICAgIFxuICAgIGN0eC5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICBcbiAgICBjb25zdCB0ZXh0dXJlID0gbmV3IFRIUkVFLkNhbnZhc1RleHR1cmUoY2FudmFzKTtcbiAgICB0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgICB0ZXh0dXJlLndyYXBTID0gVEhSRUUuQ2xhbXBUb0VkZ2VXcmFwcGluZztcbiAgICB0ZXh0dXJlLndyYXBUID0gVEhSRUUuQ2xhbXBUb0VkZ2VXcmFwcGluZztcbiAgICB0ZXh0dXJlLmZsaXBZID0gZmFsc2U7XG4gICAgcmV0dXJuIHRleHR1cmU7XG4gIH0sIFtdKTtcblxuICByZXR1cm4gKFxuICAgIDxtZXNoIHBvc2l0aW9uPXtbMCwgMCwgMF19IHNjYWxlPXtbMjAwMDAsIDIwMDAwLCAyMDAwMF19IHJlbmRlck9yZGVyPXstOTk5OX0gZnJ1c3R1bUN1bGxlZD17ZmFsc2V9PlxuICAgICAgPHNwaGVyZUdlb21ldHJ5IGFyZ3M9e1sxLCA2NCwgNjRdfSAvPlxuICAgICAgPG1lc2hCYXNpY01hdGVyaWFsXG4gICAgICAgIG1hcD17Z3JhZGllbnRUZXh0dXJlfVxuICAgICAgICBzaWRlPXtUSFJFRS5CYWNrU2lkZX1cbiAgICAgICAgZGVwdGhXcml0ZT17ZmFsc2V9XG4gICAgICAgIGRlcHRoVGVzdD17ZmFsc2V9XG4gICAgICAgIGZvZz17ZmFsc2V9XG4gICAgICAvPlxuICAgIDwvbWVzaD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2tpbGxzVmFsbGV5Wm9uZSgpIHtcbiAgICBjb25zdCBncm91cFJlZiA9IHVzZVJlZjxUSFJFRS5Hcm91cD4obnVsbCk7XG5cbiAgdXNlRnJhbWUoKF8sIGRlbHRhKSA9PiB7XG4gICAgaWYgKGdyb3VwUmVmLmN1cnJlbnQpIHtcbiAgICAgIC8vIFNsb3cgcm90YXRpb24gZm9yIHZhbGxleSBhbWJpYW5jZVxuICAgICAgZ3JvdXBSZWYuY3VycmVudC5yb3RhdGlvbi55ICs9IGRlbHRhICogMC4wMDU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gKFxuICAgICAgPGdyb3VwIHJlZj17Z3JvdXBSZWZ9IHBvc2l0aW9uPXtbMCwgMCwgMF19PlxuICAgICAgICB7LyogRGlzdGFudCBtb3VudGFpbiBzaWxob3VldHRlcyAtIGF0bW9zcGhlcmljIHBlcnNwZWN0aXZlICovfVxuICAgICAgICA8RGlzdGFudE1vdW50YWlucyAvPlxuICAgICBcbiAgICAgICAgey8qIFZhbGxleSBmbG9vciB3aXRoIHNhbmR5IHBhdGggKi99XG4gICAgICAgIDxWYWxsZXlGbG9vciAvPlxuICAgICBcbiAgICAgICAgey8qIExheWVyZWQgaGlsbHMgd2l0aCBhdG1vc3BoZXJpYyBwZXJzcGVjdGl2ZSAqL31cbiAgICAgICAge0FycmF5LmZyb20oeyBsZW5ndGg6IDEwIH0pLm1hcCgoXywgaGlsbEluZGV4KSA9PiAoXG4gICAgICAgICAgPFZhbGxleUhpbGwga2V5PXtoaWxsSW5kZXh9IGluZGV4PXtoaWxsSW5kZXh9IC8+XG4gICAgICAgICkpfVxuXG4gICAgICAgIHsvKiBQaW5lIHRyZWUgY2x1c3RlcnMgLSBtb3JlIG5hdHVyYWwgcGxhY2VtZW50ICovfVxuICAgICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogMTYgfSkubWFwKChfLCB0cmVlSW5kZXgpID0+IChcbiAgICAgICAgICA8UGluZVRyZWUga2V5PXt0cmVlSW5kZXh9IGluZGV4PXt0cmVlSW5kZXh9IC8+XG4gICAgICAgICkpfVxuXG4gICAgICAgIHsvKiBSb2NreSBvdXRjcm9wcyBmb3IgdmlzdWFsIGludGVyZXN0ICovfVxuICAgICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogNiB9KS5tYXAoKF8sIHJvY2tJbmRleCkgPT4gKFxuICAgICAgICAgIDxWYWxsZXlSb2NrIGtleT17cm9ja0luZGV4fSBpbmRleD17cm9ja0luZGV4fSAvPlxuICAgICAgICApKX1cblxuICAgICAgICB7LyogT3ZlcnNpemVkIGNsb3VkcyAtIGluc3RhbmNlZCBmb3IgcGVyZm9ybWFuY2UsIGJldHRlciBkZXB0aCAqL31cbiAgICAgICAgPEluc3RhbmNlZENsb3VkcyAvPlxuICAgICAgPC9ncm91cD5cbiAgICApO1xuICB9XG5cbmZ1bmN0aW9uIEluc3RhbmNlZENsb3VkcygpIHtcbiAgLy8gQ3VzdG9tIGxheWVyZWQgY2xvdWQgZ2VvbWV0cnkgbWF0Y2hpbmcgc2tpbGxzLXZhbGxleS5wbmcgcmVmZXJlbmNlXG4gIC8vIENsb3VkczogcHVyZSB3aGl0ZSAoI0ZGRkZGRikgd2l0aCBzdWJ0bGUgb2ZmLXdoaXRlIHNoYWRpbmcgKCNGNUY1RjUpXG4gIC8vIFVzaW5nIE1lc2hCYXNpY01hdGVyaWFsIGZvciBwdXJlIHVubGl0IHdoaXRlIGNsb3VkcyB0aGF0IGdsb3cgYWdhaW5zdCB0aGUgc2t5XG4gIC8vIDQgY2xvdWQgZm9ybWF0aW9ucywgZWFjaCB3aXRoIDItMyBsb2JlcyBmb3IgbmF0dXJhbCBmbHVmZnkgYXBwZWFyYW5jZVxuICAvLyBSRURVQ0VEIFNDQUxFOiBzbWFsbGVyLCBtb3JlIGRlbGliZXJhdGUgZm9ybWF0aW9ucyB3aXRoIGJldHRlciBkZXB0aFxuICBjb25zdCBjbG91ZEZvcm1hdGlvbnMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBmb3JtYXRpb25zID0gW1xuICAgICAgLy8gRm9ybWF0aW9uIDEgLSBsZWZ0IGZvcmVncm91bmQgKGxvd2VyLCBzbWFsbGVyKVxuICAgICAgeyBcbiAgICAgICAgbG9iZXM6IFtcbiAgICAgICAgICB7IHg6IC0zNSwgeTogMTQsIHo6IC0zMCwgc2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDQsIDIuNSwgMyksIHJvdGF0aW9uOiBuZXcgVEhSRUUuRXVsZXIoMCwgMCwgMCkgfSxcbiAgICAgICAgICB7IHg6IC0zMiwgeTogMTUsIHo6IC0yOCwgc2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDIuNSwgMS41LCAyKSwgcm90YXRpb246IG5ldyBUSFJFRS5FdWxlcigwLCAwLjIsIDApIH0sXG4gICAgICAgICAgeyB4OiAtMzgsIHk6IDE0LjUsIHo6IC0zMiwgc2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDIsIDEuMiwgMS41KSwgcm90YXRpb246IG5ldyBUSFJFRS5FdWxlcigwLCAtMC4xLCAwKSB9LFxuICAgICAgICBdLFxuICAgICAgICBtYXRlcmlhbDogeyBjb2xvcjogJyNGRkZGRkYnLCBvcGFjaXR5OiAwLjk1IH1cbiAgICAgIH0sXG4gICAgICAvLyBGb3JtYXRpb24gMiAtIHJpZ2h0IGZvcmVncm91bmQgKGxvd2VyLCBzbWFsbGVyKVxuICAgICAge1xuICAgICAgICBsb2JlczogW1xuICAgICAgICAgIHsgeDogNDAsIHk6IDEzLCB6OiAtMTUsIHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygzLjUsIDIsIDIuNSksIHJvdGF0aW9uOiBuZXcgVEhSRUUuRXVsZXIoMCwgMCwgMCkgfSxcbiAgICAgICAgICB7IHg6IDQzLCB5OiAxNCwgejogLTEzLCBzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMiwgMS4yLCAxLjUpLCByb3RhdGlvbjogbmV3IFRIUkVFLkV1bGVyKDAsIC0wLjMsIDApIH0sXG4gICAgICAgICAgeyB4OiAzNywgeTogMTMuNSwgejogLTE2LCBzY2FsZTogbmV3IFRIUkVFLlZlY3RvcjMoMS44LCAxLCAxLjMpLCByb3RhdGlvbjogbmV3IFRIUkVFLkV1bGVyKDAsIDAuMSwgMCkgfSxcbiAgICAgICAgXSxcbiAgICAgICAgbWF0ZXJpYWw6IHsgY29sb3I6ICcjRkZGRkZGJywgb3BhY2l0eTogMC45IH1cbiAgICAgIH0sXG4gICAgICAvLyBGb3JtYXRpb24gMyAtIGNlbnRlciBtaWRncm91bmQgKHNtYWxsZXIpXG4gICAgICB7XG4gICAgICAgIGxvYmVzOiBbXG4gICAgICAgICAgeyB4OiAwLCB5OiAxOCwgejogNSwgc2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDQuNSwgMywgMy41KSwgcm90YXRpb246IG5ldyBUSFJFRS5FdWxlcigwLCAwLCAwKSB9LFxuICAgICAgICAgIHsgeDogMywgeTogMTksIHo6IDYsIHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygzLCAxLjgsIDIuNSksIHJvdGF0aW9uOiBuZXcgVEhSRUUuRXVsZXIoMCwgMC40LCAwKSB9LFxuICAgICAgICAgIHsgeDogLTMsIHk6IDE4LjUsIHo6IDQsIHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMygyLCAxLjIsIDEuNSksIHJvdGF0aW9uOiBuZXcgVEhSRUUuRXVsZXIoMCwgLTAuMiwgMCkgfSxcbiAgICAgICAgXSxcbiAgICAgICAgbWF0ZXJpYWw6IHsgY29sb3I6ICcjRkZGRkZGJywgb3BhY2l0eTogMC45NSB9XG4gICAgICB9LFxuICAgICAgLy8gRm9ybWF0aW9uIDQgLSBmYXIgYmFja2dyb3VuZCAoc21hbGxlciwgc29mdGVyKVxuICAgICAge1xuICAgICAgICBsb2JlczogW1xuICAgICAgICAgIHsgeDogLTQ1LCB5OiAyMCwgejogMzUsIHNjYWxlOiBuZXcgVEhSRUUuVmVjdG9yMyg1LjUsIDMsIDQpLCByb3RhdGlvbjogbmV3IFRIUkVFLkV1bGVyKDAsIDAsIDApIH0sXG4gICAgICAgICAgeyB4OiAtMzgsIHk6IDIxLCB6OiAzOCwgc2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDQsIDIuMiwgMyksIHJvdGF0aW9uOiBuZXcgVEhSRUUuRXVsZXIoMCwgMC4zLCAwKSB9LFxuICAgICAgICAgIHsgeDogNDgsIHk6IDE5LCB6OiA0Miwgc2NhbGU6IG5ldyBUSFJFRS5WZWN0b3IzKDUsIDIuNSwgMy41KSwgcm90YXRpb246IG5ldyBUSFJFRS5FdWxlcigwLCAtMC4yLCAwKSB9LFxuICAgICAgICBdLFxuICAgICAgICBtYXRlcmlhbDogeyBjb2xvcjogJyNGNUY1RjUnLCBvcGFjaXR5OiAwLjggfVxuICAgICAgfSxcbiAgICBdO1xuICAgIHJldHVybiBmb3JtYXRpb25zO1xuICB9LCBbXSk7XG4gIFxuICByZXR1cm4gKFxuICAgIDxncm91cD5cbiAgICAgIHtjbG91ZEZvcm1hdGlvbnMubWFwKChmb3JtYXRpb24sIGZJbmRleCkgPT4gKFxuICAgICAgICA8Z3JvdXAga2V5PXtmSW5kZXh9PlxuICAgICAgICAgIHtmb3JtYXRpb24ubG9iZXMubWFwKChsb2JlLCBsSW5kZXgpID0+IChcbiAgICAgICAgICAgIDxtZXNoXG4gICAgICAgICAgICAgIGtleT17YCR7ZkluZGV4fS0ke2xJbmRleH1gfVxuICAgICAgICAgICAgICBwb3NpdGlvbj17bmV3IFRIUkVFLlZlY3RvcjMobG9iZS54LCBsb2JlLnksIGxvYmUueil9XG4gICAgICAgICAgICAgIHNjYWxlPXtsb2JlLnNjYWxlfVxuICAgICAgICAgICAgICByb3RhdGlvbj17bG9iZS5yb3RhdGlvbn1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPHNwaGVyZUdlb21ldHJ5IGFyZ3M9e1sxLCAxNiwgMTJdfSAvPlxuICAgICAgICAgICAgICA8bWVzaEJhc2ljTWF0ZXJpYWxcbiAgICAgICAgICAgICAgICBjb2xvcj17Zm9ybWF0aW9uLm1hdGVyaWFsLmNvbG9yfVxuICAgICAgICAgICAgICAgIHRyYW5zcGFyZW50XG4gICAgICAgICAgICAgICAgb3BhY2l0eT17Zm9ybWF0aW9uLm1hdGVyaWFsLm9wYWNpdHl9XG4gICAgICAgICAgICAgICAgZGVwdGhXcml0ZT17ZmFsc2V9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L21lc2g+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZ3JvdXA+XG4gICAgICApKX1cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaXN0YW50TW91bnRhaW5zKCkge1xuICByZXR1cm4gKFxuICAgIDxncm91cCBwb3NpdGlvbj17WzAsIDAsIDEwMF19PlxuICAgICAgey8qIEZhciBtb3VudGFpbiByYW5nZSAtIHdhcm0gYXRtb3NwaGVyaWMgY29sb3JzIG1hdGNoaW5nIHJlZmVyZW5jZSAqL31cbiAgICAgIHtBcnJheS5mcm9tKHsgbGVuZ3RoOiA1IH0pLm1hcCgoXywgaSkgPT4gKFxuICAgICAgICA8bWVzaCBrZXk9e2l9IHJlY2VpdmVTaGFkb3cgcG9zaXRpb249e1xuICAgICAgICAgIFtcbiAgICAgICAgICAgIC02MCArIGkgKiAzMCxcbiAgICAgICAgICAgIC0yICsgTWF0aC5zaW4oaSkgKiAzLFxuICAgICAgICAgICAgLTgwICsgaSAqIDE1XG4gICAgICAgICAgXVxuICAgICAgICB9IHJvdGF0aW9uPXtbMCwgTWF0aC5QSSAvIDIgKyBpICogMC4yLCAwXX0gc2NhbGU9e1s0MCwgMjUgKyBpICogOCwgNDBdfT5cbiAgICAgICAgICA8Y29uZUdlb21ldHJ5IGFyZ3M9e1sxLCAxLCA2XX0gLz5cbiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICAgIGNvbG9yPVwiIzZCNUIzQVwiXG4gICAgICAgICAgICByb3VnaG5lc3M9ezAuOTV9XG4gICAgICAgICAgICBtZXRhbG5lc3M9ezAuMDF9XG4gICAgICAgICAgICB0cmFuc3BhcmVudFxuICAgICAgICAgICAgb3BhY2l0eT17MC40fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvbWVzaD5cbiAgICAgICkpfVxuXG4gICAgICB7LyogTWlkIG1vdW50YWluIHJhbmdlICovfVxuICAgICAge0FycmF5LmZyb20oeyBsZW5ndGg6IDQgfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgIDxtZXNoIGtleT17aX0gcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17XG4gICAgICAgICAgW1xuICAgICAgICAgICAgLTQ1ICsgaSAqIDMwLFxuICAgICAgICAgICAgLTEgKyBNYXRoLnNpbihpICogMS41KSAqIDIsXG4gICAgICAgICAgICAtNDAgKyBpICogMTJcbiAgICAgICAgICBdXG4gICAgICAgIH0gcm90YXRpb249e1swLCBNYXRoLlBJIC8gMiArIGkgKiAwLjMsIDBdfSBzY2FsZT17WzMwLCAyMCArIGkgKiA2LCAzMF19PlxuICAgICAgICAgIDxjb25lR2VvbWV0cnkgYXJncz17WzEsIDEsIDhdfSAvPlxuICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgICAgY29sb3I9XCIjN0E2QjRBXCJcbiAgICAgICAgICAgIHJvdWdobmVzcz17MC45fVxuICAgICAgICAgICAgbWV0YWxuZXNzPXswLjAyfVxuICAgICAgICAgICAgdHJhbnNwYXJlbnRcbiAgICAgICAgICAgIG9wYWNpdHk9ezAuNn1cbiAgICAgICAgICAvPlxuICAgICAgICA8L21lc2g+XG4gICAgICApKX1cblxuICAgICAgey8qIFBlYWtzIGNhdGNoaW5nIHN1bnNldCAqL31cbiAgICAgIHtBcnJheS5mcm9tKHsgbGVuZ3RoOiAzIH0pLm1hcCgoXywgaSkgPT4gKFxuICAgICAgICA8bWVzaCBrZXk9e2l9IHJlY2VpdmVTaGFkb3cgcG9zaXRpb249e1xuICAgICAgICAgIFtcbiAgICAgICAgICAgIC0zMCArIGkgKiAyMCxcbiAgICAgICAgICAgIDUgKyBNYXRoLnNpbihpKSAqIDMsXG4gICAgICAgICAgICAtMjAgKyBpICogMTBcbiAgICAgICAgICBdXG4gICAgICAgIH0gcm90YXRpb249e1swLCBNYXRoLlBJIC8gMiArIGkgKiAwLjQsIDBdfSBzY2FsZT17WzIwLCAxOCArIGkgKiA1LCAyMF19PlxuICAgICAgICAgIDxjb25lR2VvbWV0cnkgYXJncz17WzEsIDEsIDEwXX0gLz5cbiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICAgIGNvbG9yPVwiIzhBN0I1QVwiXG4gICAgICAgICAgICByb3VnaG5lc3M9ezAuODV9XG4gICAgICAgICAgICBtZXRhbG5lc3M9ezAuMDN9XG4gICAgICAgICAgICB0cmFuc3BhcmVudFxuICAgICAgICAgICAgb3BhY2l0eT17MC43fVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvbWVzaD5cbiAgICAgICkpfVxuICAgIDwvZ3JvdXA+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFZhbGxleUZsb29yKCkge1xuICAvLyBXaW5kaW5nIGJlemllciBwYXRoIHRocm91Z2ggdGhlIHZhbGxleVxuICBjb25zdCBwYXRoQ3VydmUgPSB1c2VNZW1vKCgpID0+IHtcbiAgICByZXR1cm4gbmV3IFRIUkVFLkNhdG11bGxSb21DdXJ2ZTMoW1xuICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTcwKSxcbiAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKC0zLCAwLCAtMzApLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoMiwgMCwgMTApLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTEsIDAsIDUwKSxcbiAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDgwKSxcbiAgICBdKTtcbiAgfSwgW10pO1xuICBcbiAgY29uc3QgcGF0aFR1YmVHZW9tZXRyeSA9IHVzZU1lbW8oKCkgPT4gbmV3IFRIUkVFLlR1YmVHZW9tZXRyeShwYXRoQ3VydmUsIDIwMCwgMy41LCA4LCBmYWxzZSksIFtwYXRoQ3VydmVdKTtcbiAgY29uc3QgcGF0aEVkZ2VHZW9tZXRyeSA9IHVzZU1lbW8oKCkgPT4gbmV3IFRIUkVFLlR1YmVHZW9tZXRyeShwYXRoQ3VydmUsIDIwMCwgMy44LCA4LCBmYWxzZSksIFtwYXRoQ3VydmVdKTtcbiAgXG4gIHJldHVybiAoXG4gICAgPGdyb3VwPlxuICAgICAgey8qIEJhc2UgdmFsbGV5IGZsb29yIC0gd2FybSBncmVlbiB3aXRoIGF0bW9zcGhlcmljIHBlcnNwZWN0aXZlICovfVxuICAgICAgPG1lc2ggcmVjZWl2ZVNoYWRvdz5cbiAgICAgICAgPHBsYW5lR2VvbWV0cnkgYXJncz17WzIyMCwgMjIwLCA2MCwgNjBdfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICBjb2xvcj1cIiMzRDdBMkVcIlxuICAgICAgICAgIHJvdWdobmVzcz17MC45fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wNX1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cblxuICAgICAgey8qIFNhbmR5IHdpbmRpbmcgcGF0aCAqL31cbiAgICAgIDxtZXNoIHJlY2VpdmVTaGFkb3cgZ2VvbWV0cnk9e3BhdGhUdWJlR2VvbWV0cnl9PlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICBjb2xvcj1cIiNEMkE2NzlcIlxuICAgICAgICAgIHJvdWdobmVzcz17MC45NX1cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMH1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cblxuICAgICAgey8qIFBhdGggZWRnZXMgLSBzbGlnaHRseSBkYXJrZXIgc2FuZCBmb3IgZGVmaW5pdGlvbiAocmVwbGFjZXMgbWFnZW50YSBzdHJpcCkgKi99XG4gICAgICA8bWVzaCByZWNlaXZlU2hhZG93IGdlb21ldHJ5PXtwYXRoRWRnZUdlb21ldHJ5fT5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjRDJBNjc5XCJcbiAgICAgICAgICByb3VnaG5lc3M9ezAuOTh9XG4gICAgICAgICAgbWV0YWxuZXNzPXswLjB9XG4gICAgICAgICAgc2lkZT17VEhSRUUuRG91YmxlU2lkZX1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cblxuICAgICAgey8qIFN1YnRsZSBncmFzcyBwYXRjaGVzIGFsb25nIHBhdGggZWRnZXMgKi99XG4gICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogMzAgfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgIDxHcmFzc1BhdGNoIGtleT17aX0gaW5kZXg9e2l9IGN1cnZlPXtwYXRoQ3VydmV9IC8+XG4gICAgICApKX1cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBHcmFzc1BhdGNoKHsgaW5kZXgsIGN1cnZlIH06IHsgaW5kZXg6IG51bWJlcjsgY3VydmU/OiBUSFJFRS5DYXRtdWxsUm9tQ3VydmUzIH0pIHtcbiAgY29uc3Qgc2lkZSA9IGluZGV4ICUgMiA9PT0gMCA/IC0xIDogMTtcbiAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLmZsb29yKGluZGV4IC8gMikgLyAxNTtcbiAgXG4gIC8vIFVzZSBjdXJ2ZSBmb3IgbmF0dXJhbCBwbGFjZW1lbnQgYWxvbmcgd2luZGluZyBwYXRoXG4gIGNvbnN0IGN1cnZlUHJvZ3Jlc3MgPSBwcm9ncmVzcztcbiAgY29uc3QgcG9pbnRPbkN1cnZlID0gY3VydmUgPyBjdXJ2ZS5nZXRQb2ludEF0KGN1cnZlUHJvZ3Jlc3MpIDogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCk7XG4gIGNvbnN0IHogPSBwb2ludE9uQ3VydmUgPyBwb2ludE9uQ3VydmUueiA6ICgtNzAgKyBwcm9ncmVzcyAqIDE0MCk7XG4gIGNvbnN0IGJhc2VYID0gcG9pbnRPbkN1cnZlID8gcG9pbnRPbkN1cnZlLnggOiAwO1xuICBjb25zdCB4ID0gYmFzZVggKyBzaWRlICogKDQuNSArIE1hdGguc2luKGluZGV4ICogMC43KSAqIDEuNSk7XG4gIGNvbnN0IHkgPSAwLjM7XG4gIGNvbnN0IHNjYWxlID0gMC41ICsgTWF0aC5zaW4oaW5kZXggKiAxLjMpICogMC4yNTtcblxuICByZXR1cm4gKFxuICAgIDxncm91cCBwb3NpdGlvbj17W3gsIHksIHpdfSBzY2FsZT17W3NjYWxlLCBzY2FsZSwgc2NhbGVdfT5cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdz5cbiAgICAgICAgPGNvbmVHZW9tZXRyeSBhcmdzPXtbMC4zNSwgMC42LCA0XX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsIGNvbG9yPVwiIzJFN0QyRVwiIHJvdWdobmVzcz17MC45fSAvPlxuICAgICAgPC9tZXNoPlxuICAgICAgPG1lc2ggY2FzdFNoYWRvdyByZWNlaXZlU2hhZG93IHBvc2l0aW9uPXtbMCwgMC4xNSwgMF19IHNjYWxlPXtbMC43LCAwLjcsIDAuN119PlxuICAgICAgICA8Y29uZUdlb21ldHJ5IGFyZ3M9e1swLjI1LCAwLjQ1LCA0XX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsIGNvbG9yPVwiIzFGNEQxRlwiIHJvdWdobmVzcz17MC45NX0gLz5cbiAgICAgIDwvbWVzaD5cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBWYWxsZXlSb2NrKHsgaW5kZXggfTogeyBpbmRleDogbnVtYmVyIH0pIHtcbiAgLy8gRGV0ZXJtaW5pc3RpYyBwbGFjZW1lbnQgYWxvbmcgdmFsbGV5IHNpZGVzIC0gbW9yZSBvcmdhbmljIHBsYWNlbWVudFxuICBjb25zdCBzaWRlID0gaW5kZXggJSAyID09PSAwID8gLTEgOiAxO1xuICBjb25zdCBhbmdsZSA9IChpbmRleCAvIDgpICogTWF0aC5QSSAqIDAuOCArIE1hdGguc2luKGluZGV4KSAqIDAuMztcbiAgY29uc3QgcmFkaXVzID0gNDUgKyBNYXRoLmNvcyhpbmRleCAqIDEuNykgKiAzMDtcbiAgY29uc3QgeCA9IHNpZGUgKiBNYXRoLmNvcyhhbmdsZSkgKiByYWRpdXM7XG4gIGNvbnN0IHogPSBNYXRoLnNpbihhbmdsZSkgKiByYWRpdXM7XG4gIGNvbnN0IHkgPSAxLjU7XG4gIGNvbnN0IHNjYWxlID0gMS41ICsgTWF0aC5zaW4oaW5kZXggKiAxLjMpICogMS4wO1xuICBjb25zdCByb3RhdGlvblkgPSBhbmdsZSArIE1hdGguUEkgLyAyICsgc2lkZSAqIDAuNTtcblxuICByZXR1cm4gKFxuICAgIDxncm91cCBwb3NpdGlvbj17W3gsIHksIHpdfSByb3RhdGlvbj17WzAsIHJvdGF0aW9uWSwgMF19IHNjYWxlPXtbc2NhbGUsIHNjYWxlICogMC42LCBzY2FsZV19PlxuICAgICAgPG1lc2ggY2FzdFNoYWRvdyByZWNlaXZlU2hhZG93PlxuICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDE2LCAxMl19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzNBM0E0QVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk1fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wMn1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIDAuMywgMF19IHNjYWxlPXtbMC43LCAwLjUsIDAuN119PlxuICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDE2LCAxMl19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzJBMkEzQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk4fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wMX1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBWYWxsZXlIaWxsKHsgaW5kZXggfTogeyBpbmRleDogbnVtYmVyIH0pIHtcbiAgY29uc3QgcHJvZ3Jlc3MgPSBpbmRleCAvIDEwO1xuICBjb25zdCBhbmdsZSA9IHByb2dyZXNzICogTWF0aC5QSSAqIDIgLSBNYXRoLlBJOyAvLyAtMTgwwrAgdG8gKzE4MMKwXG4gIGNvbnN0IHJhZGl1cyA9IDY1ICsgTWF0aC5zaW4ocHJvZ3Jlc3MgKiBNYXRoLlBJKSAqIDM1O1xuICBjb25zdCB4ID0gTWF0aC5jb3MoYW5nbGUpICogcmFkaXVzO1xuICBjb25zdCB6ID0gTWF0aC5zaW4oYW5nbGUpICogcmFkaXVzO1xuICBjb25zdCB3aWR0aCA9IDIwICsgTWF0aC5zaW4ocHJvZ3Jlc3MgKiBNYXRoLlBJICogMikgKiAxMjtcbiAgY29uc3QgZGVwdGggPSAxMiArIE1hdGguc2luKHByb2dyZXNzICogTWF0aC5QSSAqIDEuNSkgKiA4O1xuICBjb25zdCBoZWlnaHQgPSAyLjUgKyBNYXRoLnNpbihwcm9ncmVzcyAqIE1hdGguUEkpICogMy41O1xuXG4gIC8vIEF0bW9zcGhlcmljIHBlcnNwZWN0aXZlIGNvbG9ycyBtYXRjaGluZyBza2lsbHMtdmFsbGV5LnBuZyByZWZlcmVuY2U6XG4gIC8vIEZvcmVncm91bmQgKGluZGV4IDAtMik6IG9saXZlIGdyZWVuICM2QjhFMjMg4oaSICM3QTlFM0FcbiAgLy8gTWlkZ3JvdW5kIChpbmRleCAzLTUpOiBwYWxlIHNhZ2UgIzhGQkM4RiDihpIgI0EzQzQ3RFxuICAvLyBCYWNrZ3JvdW5kIChpbmRleCA2LTkpOiB0YW4tYnJvd24gI0QyQjQ4Q1xuICBjb25zdCBoaWxsQ29sb3JzID0gWycjNkI4RTIzJywgJyM3QTlFM0EnLCAnIzhGQkM4RicsICcjQTNDNDdEJywgJyNEMkI0OEMnXTtcbiAgY29uc3QgY29sb3JJbmRleCA9IE1hdGgubWluKGluZGV4LCBoaWxsQ29sb3JzLmxlbmd0aCAtIDEpO1xuICBjb25zdCBiYXNlQ29sb3IgPSBoaWxsQ29sb3JzW2NvbG9ySW5kZXhdO1xuXG4gIHJldHVybiAoXG4gICAgPG1lc2hcbiAgICAgIHBvc2l0aW9uPXtbeCwgaGVpZ2h0IC8gMiwgel19XG4gICAgICByb3RhdGlvbj17WzAsIGFuZ2xlICsgTWF0aC5QSSAvIDIsIDBdfVxuICAgICAgc2NhbGU9e1t3aWR0aCwgaGVpZ2h0LCBkZXB0aF19XG4gICAgICByZWNlaXZlU2hhZG93XG4gICAgPlxuICAgICAgPGJveEdlb21ldHJ5IGFyZ3M9e1sxLCAxLCAxXX0gLz5cbiAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICBjb2xvcj17YmFzZUNvbG9yfVxuICAgICAgICByb3VnaG5lc3M9ezAuODV9XG4gICAgICAgIG1ldGFsbmVzcz17MC4wMn1cbiAgICAgIC8+XG4gICAgPC9tZXNoPlxuICApO1xufVxuXG5cbmZ1bmN0aW9uIFBpbmVUcmVlKHsgaW5kZXggfTogeyBpbmRleDogbnVtYmVyIH0pIHtcbiAgLy8gRGV0ZXJtaW5pc3RpYyBwbGFjZW1lbnQgZm9yIGNvbnNpc3RlbmN5IC0gaW1wcm92ZWQgaGllcmFyY2h5IG1hdGNoaW5nIHNraWxscy12YWxsZXkucG5nXG4gIC8vIEZvcmVncm91bmQgKGluZGV4IDAtMyk6IGxhcmdlIGZyYW1pbmcgdHJlZXMsIHdhcm0gc3Vuc2V0IGdyZWVuc1xuICAvLyBNaWRncm91bmQgKGluZGV4IDQtMTApOiBtZWRpdW0gc3Vuc2V0IGdyZWVucywgb24gaGlsbCByaWRnZXNcbiAgLy8gQmFja2dyb3VuZCAoaW5kZXggMTEtMTUpOiBzbWFsbGVyIHdhcm0gZ3JlZW5zLCBvbiBkaXN0YW50IGhpbGxzXG4gIFxuICBjb25zdCBpc0ZvcmVncm91bmQgPSBpbmRleCA8IDQ7XG4gIGNvbnN0IGlzTWlkZ3JvdW5kID0gaW5kZXggPj0gNCAmJiBpbmRleCA8IDExO1xuICBcbiAgbGV0IHgsIHosIHJhZGl1cywgdHJ1bmtIZWlnaHQsIGNhbm9weUhlaWdodCwgY2Fub3B5V2lkdGgsIGNhbm9weUNvbG9yMSwgY2Fub3B5Q29sb3IyLCBjYW5vcHlDb2xvcjM7XG4gIFxuICBpZiAoaXNGb3JlZ3JvdW5kKSB7XG4gICAgLy8gRm9yZWdyb3VuZDogbGFyZ2UgdHJlZXMgZnJhbWluZyB0aGUgdmlldyAtIHdhcm0gc3Vuc2V0IGdyZWVuc1xuICAgIGNvbnN0IGFuZ2xlID0gKGluZGV4IC8gNCkgKiBNYXRoLlBJICogMiArIE1hdGguc2luKGluZGV4KSAqIDAuMztcbiAgICByYWRpdXMgPSAzMCArIE1hdGguc2luKGluZGV4ICogMS43KSAqIDE1O1xuICAgIHggPSBNYXRoLmNvcyhhbmdsZSkgKiByYWRpdXM7XG4gICAgeiA9IE1hdGguc2luKGFuZ2xlKSAqIHJhZGl1cztcbiAgICB0cnVua0hlaWdodCA9IDYgKyBNYXRoLnNpbihpbmRleCAqIDEuMSkgKiAxLjU7XG4gICAgY2Fub3B5SGVpZ2h0ID0gNyArIE1hdGguc2luKGluZGV4ICogMS4zKSAqIDI7XG4gICAgY2Fub3B5V2lkdGggPSAzLjUgKyBNYXRoLnNpbihpbmRleCAqIDAuOSkgKiAxLjU7XG4gICAgY2Fub3B5Q29sb3IxID0gJyMyRTJBMUEnOyAgLy8gRm9yZWdyb3VuZCBwaW5lcyAtIHdhcm0gZGFyayBncmVlblxuICAgIGNhbm9weUNvbG9yMiA9ICcjM0UzQTJBJztcbiAgICBjYW5vcHlDb2xvcjMgPSAnIzRFNEEzQSc7XG4gIH0gZWxzZSBpZiAoaXNNaWRncm91bmQpIHtcbiAgICBjb25zdCBtaWRJbmRleCA9IGluZGV4IC0gNDtcbiAgICBjb25zdCBhbmdsZSA9IChtaWRJbmRleCAvIDcpICogTWF0aC5QSSAqIDIgKyBNYXRoLnNpbihtaWRJbmRleCkgKiAwLjM7XG4gICAgcmFkaXVzID0gNDUgKyBNYXRoLnNpbihtaWRJbmRleCAqIDEuNykgKiAyNTtcbiAgICB4ID0gTWF0aC5jb3MoYW5nbGUpICogcmFkaXVzO1xuICAgIHogPSBNYXRoLnNpbihhbmdsZSkgKiByYWRpdXM7XG4gICAgdHJ1bmtIZWlnaHQgPSA0LjUgKyBNYXRoLnNpbihtaWRJbmRleCAqIDEuMSkgKiAxLjU7XG4gICAgY2Fub3B5SGVpZ2h0ID0gNS41ICsgTWF0aC5zaW4obWlkSW5kZXggKiAxLjMpICogMjtcbiAgICBjYW5vcHlXaWR0aCA9IDIuNSArIE1hdGguc2luKG1pZEluZGV4ICogMC45KSAqIDEuNTtcbiAgICBjYW5vcHlDb2xvcjEgPSAnIzNFM0EyQSc7ICAvLyBNaWRncm91bmQgcGluZXMgLSB3YXJtIG1pZCBncmVlblxuICAgIGNhbm9weUNvbG9yMiA9ICcjNEU0QTNBJztcbiAgICBjYW5vcHlDb2xvcjMgPSAnIzVFNUE0QSc7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYmdJbmRleCA9IGluZGV4IC0gMTE7XG4gICAgY29uc3QgYW5nbGUgPSAoYmdJbmRleCAvIDUpICogTWF0aC5QSSAqIDIgKyBNYXRoLnNpbihiZ0luZGV4KSAqIDAuMztcbiAgICByYWRpdXMgPSA3MCArIE1hdGguc2luKGJnSW5kZXggKiAxLjcpICogMzA7XG4gICAgeCA9IE1hdGguY29zKGFuZ2xlKSAqIHJhZGl1cztcbiAgICB6ID0gTWF0aC5zaW4oYW5nbGUpICogcmFkaXVzO1xuICAgIHRydW5rSGVpZ2h0ID0gMy41ICsgTWF0aC5zaW4oYmdJbmRleCAqIDEuMSkgKiAxLjU7XG4gICAgY2Fub3B5SGVpZ2h0ID0gNC41ICsgTWF0aC5zaW4oYmdJbmRleCAqIDEuMykgKiAyO1xuICAgIGNhbm9weVdpZHRoID0gMiArIE1hdGguc2luKGJnSW5kZXggKiAwLjkpICogMS41O1xuICAgIGNhbm9weUNvbG9yMSA9ICcjNEU0QTNBJzsgIC8vIEJhY2tncm91bmQgcGluZXMgLSB3YXJtIGxpZ2h0IGdyZWVuXG4gICAgY2Fub3B5Q29sb3IyID0gJyM1RTVBNEEnO1xuICAgIGNhbm9weUNvbG9yMyA9ICcjNkU2QTVBJztcbiAgfVxuICBcbiAgY29uc3QgdHJ1bmtDb2xvciA9ICcjMkExQTFBJztcbiAgXG4gIHJldHVybiAoXG4gICAgPGdyb3VwIHBvc2l0aW9uPXtbeCwgdHJ1bmtIZWlnaHQgLyAyLCB6XX0+XG4gICAgICB7LyogVHJ1bmsgKi99XG4gICAgICA8bWVzaCBjYXN0U2hhZG93IHJlY2VpdmVTaGFkb3c+XG4gICAgICAgIDxjeWxpbmRlckdlb21ldHJ5IGFyZ3M9e1swLjQ1LCAwLjI1LCB0cnVua0hlaWdodCwgNl19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbCBjb2xvcj17dHJ1bmtDb2xvcn0gcm91Z2huZXNzPXswLjl9IC8+XG4gICAgICA8L21lc2g+XG4gICAgICB7LyogQ2Fub3B5IC0gNCBsYXllcmVkIHRyaWFuZ2xlcyBmb3IgZnVsbGVyIHBpbmUgc2lsaG91ZXR0ZSAqL31cbiAgICAgIDxncm91cCBwb3NpdGlvbj17WzAsIHRydW5rSGVpZ2h0ICsgY2Fub3B5SGVpZ2h0IC8gMiwgMF19PlxuICAgICAgICB7LyogQm90dG9tIGxheWVyIC0gd2lkZXN0ICovfVxuICAgICAgICA8bWVzaCBjYXN0U2hhZG93IHJlY2VpdmVTaGFkb3c+XG4gICAgICAgICAgPGNvbmVHZW9tZXRyeSBhcmdzPXtbY2Fub3B5V2lkdGgsIGNhbm9weUhlaWdodCwgOF19IC8+XG4gICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsIGNvbG9yPXtjYW5vcHlDb2xvcjF9IHJvdWdobmVzcz17MC44fSAvPlxuICAgICAgICA8L21lc2g+XG4gICAgICAgIHsvKiBTZWNvbmQgbGF5ZXIgKi99XG4gICAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIC0wLjI1LCAwXX0gc2NhbGU9e1swLjg4LCAwLjg4LCAwLjg4XX0+XG4gICAgICAgICAgPGNvbmVHZW9tZXRyeSBhcmdzPXtbY2Fub3B5V2lkdGggKiAwLjg4LCBjYW5vcHlIZWlnaHQgKiAwLjg1LCA4XX0gLz5cbiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9e2Nhbm9weUNvbG9yMn0gcm91Z2huZXNzPXswLjgyfSAvPlxuICAgICAgICA8L21lc2g+XG4gICAgICAgIHsvKiBUaGlyZCBsYXllciAqL31cbiAgICAgICAgPG1lc2ggY2FzdFNoYWRvdyByZWNlaXZlU2hhZG93IHBvc2l0aW9uPXtbMCwgLTAuNDUsIDBdfSBzY2FsZT17WzAuNzUsIDAuNzUsIDAuNzVdfT5cbiAgICAgICAgICA8Y29uZUdlb21ldHJ5IGFyZ3M9e1tjYW5vcHlXaWR0aCAqIDAuNzUsIGNhbm9weUhlaWdodCAqIDAuNywgOF19IC8+XG4gICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsIGNvbG9yPXtjYW5vcHlDb2xvcjN9IHJvdWdobmVzcz17MC44NX0gLz5cbiAgICAgICAgPC9tZXNoPlxuICAgICAgICB7LyogVG9wIGxheWVyIC0gbmFycm93ZXN0ICovfVxuICAgICAgICA8bWVzaCBjYXN0U2hhZG93IHJlY2VpdmVTaGFkb3cgcG9zaXRpb249e1swLCAtMC42LCAwXX0gc2NhbGU9e1swLjYsIDAuNiwgMC42XX0+XG4gICAgICAgICAgPGNvbmVHZW9tZXRyeSBhcmdzPXtbY2Fub3B5V2lkdGggKiAwLjYsIGNhbm9weUhlaWdodCAqIDAuNTUsIDhdfSAvPlxuICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbCBjb2xvcj17Y2Fub3B5Q29sb3IzfSByb3VnaG5lc3M9ezAuODh9IC8+XG4gICAgICAgIDwvbWVzaD5cbiAgICAgIDwvZ3JvdXA+XG4gICAgPC9ncm91cD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTGVmdENsaWZmV2FsbCgpIHtcbiAgcmV0dXJuIChcbiAgICA8Z3JvdXA+XG4gICAgICB7LyogQmFzZSBjbGlmZiBmYWNlIC0gbGFyZ2UgZGlzcGxhY2VkIHBsYW5lICovfVxuICAgICAgPG1lc2ggcmVjZWl2ZVNoYWRvdz5cbiAgICAgICAgPHBsYW5lR2VvbWV0cnkgYXJncz17WzEyMCwgOTAsIDQwLCAzMF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzRBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk1fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wMn1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIFxuICAgICAgey8qIFJvY2t5IG91dGNyb3BzIG9uIGNsaWZmIGZhY2UgKi99XG4gICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogMTIgfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgIDxDbGlmZlJvY2sga2V5PXtpfSBpbmRleD17aX0gc2lkZT1cImxlZnRcIiAvPlxuICAgICAgKSl9XG4gICAgICBcbiAgICAgIHsvKiBFbWlzc2l2ZSBhY2NlbnQgc3RyaXBzIGF0IGJhc2UgKi99XG4gICAgICA8bWVzaCByZWNlaXZlU2hhZG93IHBvc2l0aW9uPXtbLTU1LCAyLCAtNV19PlxuICAgICAgICA8cGxhbmVHZW9tZXRyeSBhcmdzPXtbMTAwLCA0LCAyMCwgNF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzRBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjl9XG4gICAgICAgICAgbWV0YWxuZXNzPXswLjA1fVxuICAgICAgICAgIGVtaXNzaXZlPVwiI2ZmNmIzNVwiXG4gICAgICAgICAgZW1pc3NpdmVJbnRlbnNpdHk9ezAuMn1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBSaWdodENsaWZmV2FsbCgpIHtcbiAgcmV0dXJuIChcbiAgICA8Z3JvdXA+XG4gICAgICB7LyogQmFzZSBjbGlmZiBmYWNlIC0gbGFyZ2UgZGlzcGxhY2VkIHBsYW5lICovfVxuICAgICAgPG1lc2ggcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIDAsIDBdfSByb3RhdGlvbj17WzAsIE1hdGguUEksIDBdfT5cbiAgICAgICAgPHBsYW5lR2VvbWV0cnkgYXJncz17WzEyMCwgOTAsIDQwLCAzMF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzRBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk1fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wMn1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIFxuICAgICAgey8qIFJvY2t5IG91dGNyb3BzIG9uIGNsaWZmIGZhY2UgKi99XG4gICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogMTIgfSkubWFwKChfLCBpKSA9PiAoXG4gICAgICAgIDxDbGlmZlJvY2sga2V5PXtpfSBpbmRleD17aX0gc2lkZT1cInJpZ2h0XCIgLz5cbiAgICAgICkpfVxuICAgICAgXG4gICAgICB7LyogRW1pc3NpdmUgYWNjZW50IHN0cmlwcyBhdCBiYXNlICovfVxuICAgICAgPG1lc2ggcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzU1LCAyLCAtNV19IHJvdGF0aW9uPXtbMCwgTWF0aC5QSSwgMF19PlxuICAgICAgICA8cGxhbmVHZW9tZXRyeSBhcmdzPXtbMTAwLCA0LCAyMCwgNF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzRBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjl9XG4gICAgICAgICAgbWV0YWxuZXNzPXswLjA1fVxuICAgICAgICAgIGVtaXNzaXZlPVwiI2ZmNmIzNVwiXG4gICAgICAgICAgZW1pc3NpdmVJbnRlbnNpdHk9ezAuMn1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBDbGlmZlJvY2soeyBpbmRleCwgc2lkZSB9OiB7IGluZGV4OiBudW1iZXI7IHNpZGU6ICdsZWZ0JyB8ICdyaWdodCcgfSkge1xuICBjb25zdCBzaWRlTXVsdCA9IHNpZGUgPT09ICdsZWZ0JyA/IC0xIDogMTtcbiAgY29uc3QgYW5nbGUgPSAoaW5kZXggLyAxMikgKiBNYXRoLlBJICogMS41ICsgTWF0aC5zaW4oaW5kZXgpICogMC40O1xuICBjb25zdCByYWRpdXMgPSAzNSArIE1hdGguY29zKGluZGV4ICogMS43KSAqIDE1O1xuICBjb25zdCB4ID0gc2lkZU11bHQgKiBNYXRoLmNvcyhhbmdsZSkgKiByYWRpdXM7XG4gIGNvbnN0IHogPSBNYXRoLnNpbihhbmdsZSkgKiByYWRpdXMgLSAxMDtcbiAgY29uc3QgeSA9IDIgKyBNYXRoLnNpbihpbmRleCAqIDAuNykgKiA4O1xuICBjb25zdCBzY2FsZSA9IDEuMiArIE1hdGguc2luKGluZGV4ICogMS4zKSAqIDAuODtcbiAgY29uc3Qgcm90YXRpb25ZID0gYW5nbGUgKyAoc2lkZSA9PT0gJ2xlZnQnID8gTWF0aC5QSSAvIDIgOiAtTWF0aC5QSSAvIDIpO1xuXG4gIHJldHVybiAoXG4gICAgPGdyb3VwIHBvc2l0aW9uPXtbeCwgeSwgel19IHJvdGF0aW9uPXtbMCwgcm90YXRpb25ZLCAwXX0gc2NhbGU9e1tzY2FsZSwgc2NhbGUgKiAwLjYsIHNjYWxlXX0+XG4gICAgICA8bWVzaCBjYXN0U2hhZG93IHJlY2VpdmVTaGFkb3c+XG4gICAgICAgIDxkb2RlY2FoZWRyb25HZW9tZXRyeSBhcmdzPXtbMSwgMF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzRBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk1fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wMn1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIDAuNCwgMF19IHNjYWxlPXtbMC43LCAwLjUsIDAuN119PlxuICAgICAgICA8ZG9kZWNhaGVkcm9uR2VvbWV0cnkgYXJncz17WzEsIDBdfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICBjb2xvcj1cIiMzQTMwMjBcIlxuICAgICAgICAgIHJvdWdobmVzcz17MC45OH1cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMDF9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG4gICAgPC9ncm91cD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTW91bnRhaW5QYXNzYWdlWm9uZSgpIHtcbiAgY29uc3QgZ3JvdXBSZWYgPSB1c2VSZWY8VEhSRUUuR3JvdXA+KG51bGwpO1xuXG4gIHVzZUZyYW1lKCgpID0+IHtcbiAgICAgIGlmIChncm91cFJlZi5jdXJyZW50KSB7XG4gICAgICAgIC8vIFN1YnRsZSBwdWxzYXRpbmcgbGlnaHQgaW4gdGhlIHR1bm5lbFxuICAgICAgICBncm91cFJlZi5jdXJyZW50LnBvc2l0aW9uLnkgPSBNYXRoLnNpbihEYXRlLm5vdygpICogMC4wMDEpICogMC41O1xuICAgICAgfVxuICAgIH0pO1xuXG4gIHJldHVybiAoXG4gICAgPGdyb3VwIHJlZj17Z3JvdXBSZWZ9IHBvc2l0aW9uPXtbMCwgMCwgMTAwXX0+XG4gICAgICB7LyogTGVmdCBjbGlmZiB3YWxsIC0gamFnZ2VkIG1vdW50YWluIGZhY2UgKi99XG4gICAgICA8TGVmdENsaWZmV2FsbCAvPlxuICAgICAgXG4gICAgICB7LyogUmlnaHQgY2xpZmYgd2FsbCAtIGphZ2dlZCBtb3VudGFpbiBmYWNlICovfVxuICAgICAgPFJpZ2h0Q2xpZmZXYWxsIC8+XG4gICAgICBcbiAgICAgIHsvKiBUdW5uZWwgZmxvb3IgLSBuYXJyb3cgcGF0aCB3aXRoIGVtaXNzaXZlIGd1aWRlIGVkZ2VzICovfVxuICAgICAgPFBhc3NhZ2VGbG9vciAvPlxuICAgICAgXG4gICAgICB7LyogQ2VpbGluZyAtIGFyY2hlZCwgcGFydGlhbCAqL31cbiAgICAgIDxQYXNzYWdlQ2VpbGluZyAvPlxuICAgICAgXG4gICAgICB7LyogRmxvYXRpbmcgcm9jayBmb3JtYXRpb25zICovfVxuICAgICAge0FycmF5LmZyb20oeyBsZW5ndGg6IDggfSkubWFwKChfLCByb2NrSW5kZXgpID0+IChcbiAgICAgICAgPFBhc3NhZ2VSb2NrIGtleT17cm9ja0luZGV4fSBpbmRleD17cm9ja0luZGV4fSAvPlxuICAgICAgKSl9XG4gICAgICBcbiAgICAgIHsvKiBQaW5lIHNpbGhvdWV0dGVzIG9uIGNsaWZmIGxlZGdlcyAqL31cbiAgICAgIHtBcnJheS5mcm9tKHsgbGVuZ3RoOiAxMiB9KS5tYXAoKF8sIHRyZWVJbmRleCkgPT4gKFxuICAgICAgICA8UGFzc2FnZVBpbmUga2V5PXt0cmVlSW5kZXh9IGluZGV4PXt0cmVlSW5kZXh9IC8+XG4gICAgICApKX1cbiAgICAgIFxuICAgICAgey8qIEZvZyBwbGFuZSAtIGRlbnNpdHkgaW5jcmVhc2VzIHRvd2FyZCBzdW5zZXQgKi99XG4gICAgICA8UGFzc2FnZUZvZyAvPlxuICAgIDwvZ3JvdXA+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFBhc3NhZ2VGbG9vcigpIHtcbiAgLy8gV2luZGluZyBuYXJyb3cgcGF0aCB0aHJvdWdoIHRoZSBwYXNzYWdlXG4gIGNvbnN0IHBhdGhDdXJ2ZSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIHJldHVybiBuZXcgVEhSRUUuQ2F0bXVsbFJvbUN1cnZlMyhbXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAxMDApLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTIsIDAsIDE0MCksXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMygxLCAwLCAxODApLFxuICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoLTEsIDAsIDIyMCksXG4gICAgICBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAyNTApLFxuICAgIF0pO1xuICB9LCBbXSk7XG4gIFxuICBjb25zdCBwYXRoVHViZUdlb21ldHJ5ID0gdXNlTWVtbygoKSA9PiBuZXcgVEhSRUUuVHViZUdlb21ldHJ5KHBhdGhDdXJ2ZSwgMTUwLCAxLjUsIDgsIGZhbHNlKSwgW3BhdGhDdXJ2ZV0pO1xuICBjb25zdCBlZGdlR2VvbWV0cnkgPSB1c2VNZW1vKCgpID0+IG5ldyBUSFJFRS5UdWJlR2VvbWV0cnkocGF0aEN1cnZlLCAxNTAsIDEuOCwgOCwgZmFsc2UpLCBbcGF0aEN1cnZlXSk7XG4gIFxuICByZXR1cm4gKFxuICAgIDxncm91cD5cbiAgICAgIHsvKiBCYXNlIHBhc3NhZ2UgZmxvb3IgLSB3YXJtIHN1bnNldCBjb2xvciAqL31cbiAgICAgIDxtZXNoIHJlY2VpdmVTaGFkb3c+XG4gICAgICAgIDxwbGFuZUdlb21ldHJ5IGFyZ3M9e1sxNTAsIDE1MCwgMzAsIDMwXX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjM0QzQTJBXCJcbiAgICAgICAgICByb3VnaG5lc3M9ezAuOTV9XG4gICAgICAgICAgbWV0YWxuZXNzPXswLjAyfVxuICAgICAgICAvPlxuICAgICAgPC9tZXNoPlxuXG4gICAgICB7LyogTmFycm93IHdpbmRpbmcgcGF0aCAtIHdhcm0gc2FuZHkgY29sb3IgKi99XG4gICAgICA8bWVzaCByZWNlaXZlU2hhZG93IGdlb21ldHJ5PXtwYXRoVHViZUdlb21ldHJ5fT5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjRDJBNjc5XCJcbiAgICAgICAgICByb3VnaG5lc3M9ezAuOTV9XG4gICAgICAgICAgbWV0YWxuZXNzPXswLjB9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG5cbiAgICAgIHsvKiBFbWlzc2l2ZSBlZGdlIHN0cmlwcyAtIHN1YnRsZSB3YXJtIHNhbmQgY29sb3IgaW5zdGVhZCBvZiBicmlnaHQgbWFnZW50YSAqL31cbiAgICAgIDxtZXNoIHJlY2VpdmVTaGFkb3cgZ2VvbWV0cnk9e2VkZ2VHZW9tZXRyeX0+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiI0QyQTY3OVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk1fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wfVxuICAgICAgICAgIHNpZGU9e1RIUkVFLkRvdWJsZVNpZGV9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG5cbiAgICAgIHsvKiBTdWJ0bGUgZGVicmlzIGFsb25nIGVkZ2VzICovfVxuICAgICAge0FycmF5LmZyb20oeyBsZW5ndGg6IDE2IH0pLm1hcCgoXywgaSkgPT4gKFxuICAgICAgICA8UGFzc2FnZURlYnJpcyBrZXk9e2l9IGluZGV4PXtpfSBjdXJ2ZT17cGF0aEN1cnZlfSAvPlxuICAgICAgKSl9XG4gICAgPC9ncm91cD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUGFzc2FnZURlYnJpcyh7IGluZGV4LCBjdXJ2ZSB9OiB7IGluZGV4OiBudW1iZXI7IGN1cnZlOiBUSFJFRS5DYXRtdWxsUm9tQ3VydmUzIH0pIHtcbiAgY29uc3Qgc2lkZSA9IGluZGV4ICUgMiA9PT0gMCA/IC0xIDogMTtcbiAgY29uc3QgcHJvZ3Jlc3MgPSBpbmRleCAvIDE2O1xuICBjb25zdCBwb2ludE9uQ3VydmUgPSBjdXJ2ZS5nZXRQb2ludEF0KHByb2dyZXNzKTtcbiAgY29uc3QgeiA9IHBvaW50T25DdXJ2ZSA/IHBvaW50T25DdXJ2ZS56IDogKDEwMCArIHByb2dyZXNzICogMTUwKTtcbiAgY29uc3QgYmFzZVggPSBwb2ludE9uQ3VydmUgPyBwb2ludE9uQ3VydmUueCA6IDA7XG4gIGNvbnN0IHggPSBiYXNlWCArIHNpZGUgKiAoMi41ICsgTWF0aC5zaW4oaW5kZXggKiAwLjcpICogMC44KTtcbiAgY29uc3QgeSA9IDAuMztcbiAgY29uc3Qgc2NhbGUgPSAwLjUgKyBNYXRoLnNpbihpbmRleCAqIDEuMykgKiAwLjM7XG5cbiAgcmV0dXJuIChcbiAgICA8Z3JvdXAgcG9zaXRpb249e1t4LCB5LCB6XX0gc2NhbGU9e1tzY2FsZSwgc2NhbGUsIHNjYWxlXX0+XG4gICAgICA8bWVzaCBjYXN0U2hhZG93IHJlY2VpdmVTaGFkb3c+XG4gICAgICAgIDxkb2RlY2FoZWRyb25HZW9tZXRyeSBhcmdzPXtbMSwgMF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbCBjb2xvcj1cIiMyQTI1MUFcIiByb3VnaG5lc3M9ezAuOTV9IG1ldGFsbmVzcz17MC4wMn0gLz5cbiAgICAgIDwvbWVzaD5cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBQYXNzYWdlQ2VpbGluZygpIHtcbiAgLy8gQXJjaGVkIHBhcnRpYWwgY2VpbGluZ1xuICByZXR1cm4gKFxuICAgIDxncm91cCBwb3NpdGlvbj17WzAsIDE4LCAxNzVdfT5cbiAgICAgIDxtZXNoIHJlY2VpdmVTaGFkb3c+XG4gICAgICAgIDxjeWxpbmRlckdlb21ldHJ5IGFyZ3M9e1s2MCwgNjAsIDIwMCwgMzIsIDEsIHRydWUsIDAsIE1hdGguUEldfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICBjb2xvcj1cIiMzQTNBMkFcIlxuICAgICAgICAgIHJvdWdobmVzcz17MC45NX1cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMDJ9XG4gICAgICAgICAgc2lkZT17VEhSRUUuRG91YmxlU2lkZX1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICA8L2dyb3VwPlxuICApO1xufVxuXG5mdW5jdGlvbiBQYXNzYWdlUm9jayh7IGluZGV4IH06IHsgaW5kZXg6IG51bWJlciB9KSB7XG4gIGNvbnN0IGFuZ2xlID0gKGluZGV4IC8gOCkgKiBNYXRoLlBJICogMjtcbiAgY29uc3QgcmFkaXVzID0gMTIgKyBNYXRoLnNpbihpbmRleCAqIDEuNykgKiA4O1xuICBjb25zdCB4ID0gTWF0aC5jb3MoYW5nbGUpICogcmFkaXVzO1xuICBjb25zdCB6ID0gTWF0aC5zaW4oYW5nbGUpICogcmFkaXVzO1xuICBjb25zdCB5ID0gMS41ICsgTWF0aC5zaW4oaW5kZXggKiAwLjcpICogMjtcbiAgY29uc3Qgc2NhbGUgPSAxLjIgKyBNYXRoLnNpbihpbmRleCkgKiAwLjY7XG4gIGNvbnN0IHJvdGF0aW9uWSA9IGFuZ2xlICsgTWF0aC5zaW4oaW5kZXggKiAyKSAqIDAuNTtcblxuICByZXR1cm4gKFxuICAgIDxncm91cCBwb3NpdGlvbj17W3gsIHksIHpdfSByb3RhdGlvbj17WzAsIHJvdGF0aW9uWSwgMF19IHNjYWxlPXtbc2NhbGUsIHNjYWxlICogMC43LCBzY2FsZV19PlxuICAgICAgPG1lc2ggY2FzdFNoYWRvdyByZWNlaXZlU2hhZG93PlxuICAgICAgICA8ZG9kZWNhaGVkcm9uR2VvbWV0cnkgYXJncz17WzEsIDBdfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICBjb2xvcj1cIiMzQTMwMjBcIlxuICAgICAgICAgIHJvdWdobmVzcz17MC45fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wM31cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIDAuNSwgMF19IHNjYWxlPXtbMC42LCAwLjQsIDAuNl19PlxuICAgICAgICA8ZG9kZWNhaGVkcm9uR2VvbWV0cnkgYXJncz17WzEsIDBdfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWxcbiAgICAgICAgICBjb2xvcj1cIiMyQTI1MUFcIlxuICAgICAgICAgIHJvdWdobmVzcz17MC45NX1cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMDJ9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG4gICAgPC9ncm91cD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUGFzc2FnZVBpbmUoeyBpbmRleCB9OiB7IGluZGV4OiBudW1iZXIgfSkge1xuICBjb25zdCBzaWRlID0gaW5kZXggJSAyID09PSAwID8gLTEgOiAxO1xuICBjb25zdCBhbmdsZSA9IChpbmRleCAvIDEyKSAqIE1hdGguUEkgKiAxLjIgKyBNYXRoLnNpbihpbmRleCkgKiAwLjQ7XG4gIGNvbnN0IHJhZGl1cyA9IDQyICsgTWF0aC5zaW4oaW5kZXggKiAxLjcpICogMTA7XG4gIGNvbnN0IHggPSBzaWRlICogTWF0aC5jb3MoYW5nbGUpICogcmFkaXVzO1xuICBjb25zdCB6ID0gTWF0aC5zaW4oYW5nbGUpICogcmFkaXVzICsgNTtcbiAgY29uc3QgdHJ1bmtIZWlnaHQgPSA0ICsgTWF0aC5zaW4oaW5kZXggKiAxLjEpICogMjtcbiAgXG4gIGNvbnN0IGNhbm9weUhlaWdodCA9IDUgKyBNYXRoLnNpbihpbmRleCAqIDEuMykgKiAyO1xuICBjb25zdCBjYW5vcHlXaWR0aCA9IDIuNSArIE1hdGguc2luKGluZGV4ICogMC45KSAqIDE7XG4gIFxuICAvLyBXYXJtZXIsIG1vcmUgdmlzaWJsZSBwaW5lIGNvbG9ycyB0aGF0IGJsZW5kIHdpdGggc3Vuc2V0XG4gIGNvbnN0IGNhbm9weUNvbG9yMSA9ICcjMkUyQTFBJztcbiAgY29uc3QgY2Fub3B5Q29sb3IyID0gJyMzRTNBMkEnO1xuICBjb25zdCBjYW5vcHlDb2xvcjMgPSAnIzRFNEEzQSc7XG4gIGNvbnN0IHRydW5rQ29sb3IgPSAnIzJBMUExQSc7XG5cbiAgcmV0dXJuIChcbiAgICA8Z3JvdXAgcG9zaXRpb249e1t4LCB0cnVua0hlaWdodCAvIDIsIHpdfT5cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdz5cbiAgICAgICAgPGN5bGluZGVyR2VvbWV0cnkgYXJncz17WzAuMzUsIDAuMiwgdHJ1bmtIZWlnaHQsIDZdfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9e3RydW5rQ29sb3J9IHJvdWdobmVzcz17MC45fSAvPlxuICAgICAgPC9tZXNoPlxuICAgICAgPGdyb3VwIHBvc2l0aW9uPXtbMCwgdHJ1bmtIZWlnaHQgKyBjYW5vcHlIZWlnaHQgLyAyLCAwXX0+XG4gICAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdz5cbiAgICAgICAgICA8Y29uZUdlb21ldHJ5IGFyZ3M9e1tjYW5vcHlXaWR0aCwgY2Fub3B5SGVpZ2h0LCA4XX0gLz5cbiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9e2Nhbm9weUNvbG9yMX0gcm91Z2huZXNzPXswLjg1fSAvPlxuICAgICAgICA8L21lc2g+XG4gICAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIC0wLjMsIDBdfSBzY2FsZT17WzAuODUsIDAuODUsIDAuODVdfT5cbiAgICAgICAgICA8Y29uZUdlb21ldHJ5IGFyZ3M9e1tjYW5vcHlXaWR0aCAqIDAuODUsIGNhbm9weUhlaWdodCAqIDAuOCwgOF19IC8+XG4gICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsIGNvbG9yPXtjYW5vcHlDb2xvcjJ9IHJvdWdobmVzcz17MC44N30gLz5cbiAgICAgICAgPC9tZXNoPlxuICAgICAgICA8bWVzaCBjYXN0U2hhZG93IHJlY2VpdmVTaGFkb3cgcG9zaXRpb249e1swLCAtMC41NSwgMF19IHNjYWxlPXtbMC42NSwgMC42NSwgMC42NV19PlxuICAgICAgICAgIDxjb25lR2VvbWV0cnkgYXJncz17W2Nhbm9weVdpZHRoICogMC42NSwgY2Fub3B5SGVpZ2h0ICogMC42LCA4XX0gLz5cbiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9e2Nhbm9weUNvbG9yM30gcm91Z2huZXNzPXswLjl9IC8+XG4gICAgICAgIDwvbWVzaD5cbiAgICAgIDwvZ3JvdXA+XG4gICAgPC9ncm91cD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUGFzc2FnZUZvZygpIHtcbiAgLy8gRm9nIHBsYW5lIHdpdGggZ3JhZGllbnQgZGVuc2l0eSAtIGluY3JlYXNlcyB0b3dhcmQgc3Vuc2V0ICh6PTI1MClcbiAgLy8gVXNpbmcgd2FybWVyLCBtb3JlIHRyYW5zcGFyZW50IGZvZyB0aGF0IGJsZW5kcyB3aXRoIHN1bnNldCBza3lcbiAgcmV0dXJuIChcbiAgICA8Z3JvdXA+XG4gICAgICA8bWVzaCByZWNlaXZlU2hhZG93IHBvc2l0aW9uPXtbMCwgMSwgMTAwXX0+XG4gICAgICAgIDxwbGFuZUdlb21ldHJ5IGFyZ3M9e1syMDAsIDE1MCwgNDAsIDMwXX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjM0EzQTJBXCJcbiAgICAgICAgICByb3VnaG5lc3M9ezF9XG4gICAgICAgICAgbWV0YWxuZXNzPXswfVxuICAgICAgICAgIHRyYW5zcGFyZW50XG4gICAgICAgICAgb3BhY2l0eT17MC4xfVxuICAgICAgICAgIHNpZGU9e1RIUkVFLkRvdWJsZVNpZGV9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG4gICAgICA8bWVzaCByZWNlaXZlU2hhZG93IHBvc2l0aW9uPXtbMCwgMSwgMTc1XX0+XG4gICAgICAgIDxwbGFuZUdlb21ldHJ5IGFyZ3M9e1syMDAsIDE1MCwgNDAsIDMwXX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjM0EzQTJBXCJcbiAgICAgICAgICByb3VnaG5lc3M9ezF9XG4gICAgICAgICAgbWV0YWxuZXNzPXswfVxuICAgICAgICAgIHRyYW5zcGFyZW50XG4gICAgICAgICAgb3BhY2l0eT17MC4xNX1cbiAgICAgICAgICBzaWRlPXtUSFJFRS5Eb3VibGVTaWRlfVxuICAgICAgICAvPlxuICAgICAgPC9tZXNoPlxuICAgICAgPG1lc2ggcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIDEsIDI1MF19PlxuICAgICAgICA8cGxhbmVHZW9tZXRyeSBhcmdzPXtbMjAwLCAxNTAsIDQwLCAzMF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzNBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXsxfVxuICAgICAgICAgIG1ldGFsbmVzcz17MH1cbiAgICAgICAgICB0cmFuc3BhcmVudFxuICAgICAgICAgIG9wYWNpdHk9ezAuMn1cbiAgICAgICAgICBzaWRlPXtUSFJFRS5Eb3VibGVTaWRlfVxuICAgICAgICAvPlxuICAgICAgPC9tZXNoPlxuICAgIDwvZ3JvdXA+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFByb2plY3RzU3Vuc2V0Wm9uZSgpIHtcbiAgY29uc3QgZ3JvdXBSZWYgPSB1c2VSZWY8VEhSRUUuR3JvdXA+KG51bGwpO1xuXG4gIHVzZUZyYW1lKChfLCBkZWx0YSkgPT4ge1xuICAgIGlmIChncm91cFJlZi5jdXJyZW50KSB7XG4gICAgICAvLyBTbG93IHJvdGF0aW9uIGZvciBzdW5zZXQgYW1iaWFuY2VcbiAgICAgIGdyb3VwUmVmLmN1cnJlbnQucm90YXRpb24ueSArPSBkZWx0YSAqIDAuMDAzO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIChcbiAgICA8Z3JvdXAgcmVmPXtncm91cFJlZn0gcG9zaXRpb249e1swLCAwLCA2MF19PlxuICAgICAgey8qIERpc3RhbnQgbW91bnRhaW4gc2lsaG91ZXR0ZSAqL31cbiAgICAgIDxtZXNoIHJlY2VpdmVTaGFkb3c+XG4gICAgICAgIDxwbGFuZUdlb21ldHJ5IGFyZ3M9e1sxNTAsIDQwLCAyNCwgOF19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiIzNBM0EyQVwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjk4fVxuICAgICAgICAgIG1ldGFsbmVzcz17MC4wMX1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cblxuICAgICAgey8qIFN1bnNldCBnbG93IC0gcmFkaWF0aW5nIHBsYW5lcyAqL31cbiAgICAgIHtBcnJheS5mcm9tKHsgbGVuZ3RoOiA2IH0pLm1hcCgoXywgcmluZ0luZGV4KSA9PiAoXG4gICAgICAgIDxTdW5zZXRSaW5nIGtleT17cmluZ0luZGV4fSBpbmRleD17cmluZ0luZGV4fSAvPlxuICAgICAgKSl9XG5cbiAgICAgIHsvKiBGb3JlZ3JvdW5kIGVsZW1lbnRzICovfVxuICAgICAgPG1lc2ggcmVjZWl2ZVNoYWRvdyBwb3NpdGlvbj17WzAsIC0xLCAwXX0+XG4gICAgICAgIDxwbGFuZUdlb21ldHJ5IGFyZ3M9e1sxMDAsIDEwMCwgMTYsIDE2XX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjM0EzQTJBXCJcbiAgICAgICAgICByb3VnaG5lc3M9ezAuOX1cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMDJ9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG4gICAgPC9ncm91cD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU3Vuc2V0UmluZyh7IGluZGV4IH06IHsgaW5kZXg6IG51bWJlciB9KSB7XG4gIGNvbnN0IHByb2dyZXNzID0gaW5kZXggLyA1O1xuICBjb25zdCByYWRpdXMgPSAyMCArIHByb2dyZXNzICogNjA7XG4gIGNvbnN0IHNlZ21lbnRzID0gMTYgKyBNYXRoLmZsb29yKHByb2dyZXNzICogMTYpO1xuICBjb25zdCB0aGlja25lc3MgPSAxICsgcHJvZ3Jlc3MgKiAyO1xuICBjb25zdCBoZWlnaHQgPSAwLjU7XG5cbiAgLy8gU3Vuc2V0IGNvbG9yIGdyYWRpZW50OiBvcmFuZ2Ug4oaSIHdhcm0geWVsbG93IOKGkiBwYWxlIG9yYW5nZSAobm8gbWFnZW50YSlcbiAgbGV0IGNvbG9yID0gXCIjZmY0NTAwXCI7IC8vIG9yYW5nZS1yZWRcbiAgaWYgKHByb2dyZXNzID4gMC40KSB7XG4gICAgY29sb3IgPSBwcm9ncmVzcyA+IDAuNyA/IFwiI0ZGQjc0RFwiIDogXCIjRkZDQzgwXCI7IC8vIGRlZXAgb3JhbmdlIOKGkiBwYWxlIG9yYW5nZVxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8bWVzaFxuICAgICAgcG9zaXRpb249e1swLCBoZWlnaHQsIDBdfVxuICAgICAgcm90YXRpb249e1tNYXRoLlBJIC8gMiwgMCwgMF19XG4gICAgICByZWNlaXZlU2hhZG93XG4gICAgPlxuICAgICAgPHJpbmdHZW9tZXRyeSBhcmdzPXtbcmFkaXVzIC0gdGhpY2tuZXNzLCByYWRpdXMsIHNlZ21lbnRzXX0gLz5cbiAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICBjb2xvcj17Y29sb3J9XG4gICAgICAgIHJvdWdobmVzcz17MC43fVxuICAgICAgICBtZXRhbG5lc3M9ezAuMX1cbiAgICAgICAgc2lkZT17VEhSRUUuRG91YmxlU2lkZX1cbiAgICAgICAgdHJhbnNwYXJlbnRcbiAgICAgICAgb3BhY2l0eT17MC42IC0gcHJvZ3Jlc3MgKiAwLjN9XG4gICAgICAvPlxuICAgIDwvbWVzaD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2tpbGxNYXJrZXIoeyBzdG9wIH06IHsgc3RvcDogdHlwZW9mIFNLSUxMX1NUT1BTW251bWJlcl0gfSkge1xuICBjb25zdCBbaG92ZXJlZCwgc2V0SG92ZXJlZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IG1hcmtlclJlZiA9IHVzZVJlZjxUSFJFRS5NZXNoPihudWxsKTtcblxuICB1c2VGcmFtZSgoKSA9PiB7XG4gICAgaWYgKG1hcmtlclJlZi5jdXJyZW50KSB7XG4gICAgICAvLyBHZW50bGUgYm9iYmluZyBhbmltYXRpb25cbiAgICAgIG1hcmtlclJlZi5jdXJyZW50LnBvc2l0aW9uLnkgPSAzICsgTWF0aC5zaW4oRGF0ZS5ub3coKSAqIDAuMDAyICsgc3RvcC5pZC5sZW5ndGgpICogMC41O1xuICAgICAgLy8gU2xvdyByb3RhdGlvblxuICAgICAgbWFya2VyUmVmLmN1cnJlbnQucm90YXRpb24ueSArPSAwLjAxO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgaGFuZGxlQ2xpY2sgPSAoKSA9PiB7XG4gICAgLy8gVXBkYXRlIG92ZXJsYXkgY29udGVudFxuICAgIGNvbnN0IHRpdGxlRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3ZlcmxheS10aXRsZScpO1xuICAgIGNvbnN0IGJvZHlFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvdmVybGF5LWJvZHknKTtcbiAgICBpZiAodGl0bGVFbCAmJiBib2R5RWwpIHtcbiAgICAgIHRpdGxlRWwudGV4dENvbnRlbnQgPSBzdG9wLm5hbWU7XG4gICAgICBib2R5RWwuaW5uZXJIVE1MID0gYFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNraWxsLWRldGFpbFwiPlxuICAgICAgICAgIDxoMz4ke3N0b3AubmFtZX08L2gzPlxuICAgICAgICAgIDxwPkNsb3VkIGluZnJhc3RydWN0dXJlIGFuZCBEZXZPcHMgdGVjaG5vbG9neTwvcD5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNraWxsLWljb25cIj7imIHvuI88L2Rpdj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJoaW50XCI+TmF2aWdhdGUgdG8gbmV4dCBza2lsbCB1c2luZyBXQVNEL0Fycm93IEtleXM8L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgYDtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPG1lc2hcbiAgICAgICAgcmVmPXttYXJrZXJSZWZ9XG4gICAgICAgIHBvc2l0aW9uPXtbc3RvcC54LCAzLCBzdG9wLnpdfVxuICAgICAgICBzY2FsZT17WzEuMiwgMS4yLCAxLjJdfVxuICAgICAgICBvbkNsaWNrPXtoYW5kbGVDbGlja31cbiAgICAgICAgb25Qb2ludGVyT3Zlcj17KCkgPT4gc2V0SG92ZXJlZCh0cnVlKX1cbiAgICAgICAgb25Qb2ludGVyT3V0PXsoKSA9PiBzZXRIb3ZlcmVkKGZhbHNlKX1cbiAgICAgID5cbiAgICAgICAgPGJveEdlb21ldHJ5IGFyZ3M9e1sxLCAxLCAxXX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9e3N0b3Auc2lkZSA9PT0gJ2xlZnQnID8gXCIjNGE5MGUyXCIgOiBcIiNlOTRhNGFcIn1cbiAgICAgICAgICByb3VnaG5lc3M9ezAuM31cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuNn1cbiAgICAgICAgICBlbWlzc2l2ZT17aG92ZXJlZCA/IFwiI2ZmZmYwMFwiIDogXCIjMDAwMDAwXCJ9XG4gICAgICAgICAgZW1pc3NpdmVJbnRlbnNpdHk9e2hvdmVyZWQgPyAwLjUgOiAwfVxuICAgICAgICAvPlxuICAgICAgPC9tZXNoPlxuICAgICAgey8qIFNraWxsIGxhYmVsIC0gYWx3YXlzIGZhY2luZyBjYW1lcmEgKi99XG4gICAgICA8SHRtbFxuICAgICAgICBwb3NpdGlvbj17W3N0b3AueCwgNSwgc3RvcC56XX1cbiAgICAgICAgZGlzdGFuY2VGYWN0b3I9ezEuNX1cbiAgICAgID5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJza2lsbC1sYWJlbFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2tpbGwtbGFiZWwtY29udGVudFwiPntzdG9wLm5hbWV9PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9IdG1sPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBQcm9qZWN0TWFya2VyKHsgcHJvamVjdCB9OiB7IHByb2plY3Q6IHR5cGVvZiBQUk9KRUNUX0RBVEFbbnVtYmVyXSB9KSB7XG4gIGNvbnN0IFtob3ZlcmVkLCBzZXRIb3ZlcmVkXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgbWFya2VyUmVmID0gdXNlUmVmPFRIUkVFLk1lc2g+KG51bGwpO1xuXG4gIHVzZUZyYW1lKCgpID0+IHtcbiAgICBpZiAobWFya2VyUmVmLmN1cnJlbnQpIHtcbiAgICAgIC8vIEdlbnRsZSBmbG9hdGluZyBhbmltYXRpb25cbiAgICAgIG1hcmtlclJlZi5jdXJyZW50LnBvc2l0aW9uLnkgPSA0ICsgTWF0aC5zaW4oRGF0ZS5ub3coKSAqIDAuMDAxNSArIHByb2plY3QuaWQubGVuZ3RoKSAqIDAuODtcbiAgICAgIC8vIFNsb3cgcm90YXRpb25cbiAgICAgIG1hcmtlclJlZi5jdXJyZW50LnJvdGF0aW9uLnkgKz0gMC4wMDg7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBoYW5kbGVDbGljayA9ICgpID0+IHtcbiAgICAvLyBVcGRhdGUgb3ZlcmxheSBjb250ZW50XG4gICAgY29uc3QgdGl0bGVFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvdmVybGF5LXRpdGxlJyk7XG4gICAgY29uc3QgYm9keUVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ292ZXJsYXktYm9keScpO1xuICAgIGlmICh0aXRsZUVsICYmIGJvZHlFbCkge1xuICAgICAgdGl0bGVFbC50ZXh0Q29udGVudCA9IHByb2plY3QudGl0bGU7XG4gICAgICBib2R5RWwuaW5uZXJIVE1MID0gYFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInByb2plY3QtZGV0YWlsXCI+XG4gICAgICAgICAgPGgzPiR7cHJvamVjdC50aXRsZX08L2gzPlxuICAgICAgICAgIDxwPiR7cHJvamVjdC50ZWNobm9sb2dpZXMuc2xpY2UoMCwgNCkuam9pbignLCAnKX08L3A+XG4gICAgICAgICAgPGEgaHJlZj1cIiR7cHJvamVjdC5naXRodWJ9XCIgdGFyZ2V0PVwiX2JsYW5rXCIgcmVsPVwibm9vcGVuZXIgbm9yZWZlcnJlclwiIGNsYXNzTmFtZT1cImdpdGh1Yi1saW5rXCI+XG4gICAgICAgICAgICBWaWV3IG9uIEdpdEh1YiDihpJcbiAgICAgICAgICA8L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgYDtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPG1lc2hcbiAgICAgICAgcmVmPXttYXJrZXJSZWZ9XG4gICAgICAgIHBvc2l0aW9uPXtbMCwgNCwgMF19IC8vIENlbnRlcmVkIGluIHByb2plY3RzIHpvbmUgKHJlbGF0aXZlIHRvIFByb2plY3RzU3Vuc2V0Wm9uZSBhdCBbMCwwLDYwXSAtPiB3b3JsZCBbMCw0LDYwXSlcbiAgICAgICAgc2NhbGU9e1sxLjgsIDEuOCwgMS44XX1cbiAgICAgICAgb25DbGljaz17aGFuZGxlQ2xpY2t9XG4gICAgICAgIG9uUG9pbnRlck92ZXI9eygpID0+IHNldEhvdmVyZWQodHJ1ZSl9XG4gICAgICAgIG9uUG9pbnRlck91dD17KCkgPT4gc2V0SG92ZXJlZChmYWxzZSl9XG4gICAgICA+XG4gICAgICAgIDxib3hHZW9tZXRyeSBhcmdzPXtbMSwgMSwgMV19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbFxuICAgICAgICAgIGNvbG9yPVwiI2ZmOGMwMFwiXG4gICAgICAgICAgcm91Z2huZXNzPXswLjR9XG4gICAgICAgICAgbWV0YWxuZXNzPXswLjV9XG4gICAgICAgICAgZW1pc3NpdmU9e2hvdmVyZWQgPyBcIiNmZmZmMDBcIiA6IFwiIzAwMDAwMFwifVxuICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXtob3ZlcmVkID8gMC4zIDogMH1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIHsvKiBQcm9qZWN0IGxhYmVsICovfVxuICAgICAgPEh0bWxcbiAgICAgICAgcG9zaXRpb249e1swLCA2LCAwXX0gLy8gUmVsYXRpdmUgdG8gUHJvamVjdHNTdW5zZXRab25lXG4gICAgICAgIGRpc3RhbmNlRmFjdG9yPXsxLjV9XG4gICAgICA+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHJvamVjdC1sYWJlbFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHJvamVjdC1sYWJlbC1jb250ZW50XCI+e3Byb2plY3QudGl0bGV9PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9IdG1sPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBDbG91ZENoYXJhY3RlcigpIHtcbiAgY29uc3QgY2hhcmFjdGVyUmVmID0gdXNlUmVmPFRIUkVFLkdyb3VwPihudWxsKTtcbiAgY29uc3QgW3Bvc2l0aW9uLCBzZXRQb3NpdGlvbl0gPSB1c2VTdGF0ZSh7IHg6IC0yMCwgeTogMywgejogMCB9KTsgLy8gU3RhcnQgYXQgZmlyc3Qgc2tpbGxcbiAgY29uc3QgW3ZlbG9jaXR5LCBzZXRWZWxvY2l0eV0gPSB1c2VTdGF0ZSh7IHg6IDAsIHo6IDAgfSk7XG4gIGNvbnN0IGtleXNSZWYgPSB1c2VSZWY8UmVjb3JkPHN0cmluZywgYm9vbGVhbj4+KHt9KTtcbiAgY29uc3QgW3RhcmdldFNraWxsSW5kZXgsIHNldFRhcmdldFNraWxsSW5kZXhdID0gdXNlU3RhdGUoMCk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBoYW5kbGVLZXlEb3duID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICAgIGtleXNSZWYuY3VycmVudFtlLmtleS50b0xvd2VyQ2FzZSgpXSA9IHRydWU7XG4gICAgfTtcbiAgICBjb25zdCBoYW5kbGVLZXlVcCA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICBrZXlzUmVmLmN1cnJlbnRbZS5rZXkudG9Mb3dlckNhc2UoKV0gPSBmYWxzZTtcbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlS2V5RG93bik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgaGFuZGxlS2V5VXApO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZUtleURvd24pO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywgaGFuZGxlS2V5VXApO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICB1c2VGcmFtZSgoXywgZGVsdGEpID0+IHtcbiAgICBpZiAoIWNoYXJhY3RlclJlZi5jdXJyZW50KSByZXR1cm47XG5cbiAgICBjb25zdCBzcGVlZCA9IDY7IC8vIFJlZHVjZWQgZm9yIGd1aWRlZCBqb3VybmV5XG4gICAgY29uc3QgZnJpY3Rpb24gPSAwLjg4O1xuXG4gICAgbGV0IHZ4ID0gMDtcbiAgICBsZXQgdnogPSAwO1xuXG4gICAgLy8gTW92ZW1lbnQgY29uc3RyYWludHMgLSBwcmV2ZW50IGdvaW5nIHRvbyBmYXIgb2ZmIHBhdGhcbiAgICBjb25zdCBtYXhYID0gMjU7XG4gICAgY29uc3QgbWF4WiA9IDgwO1xuXG4gICAgaWYgKGtleXNSZWYuY3VycmVudFsndyddIHx8IGtleXNSZWYuY3VycmVudFsnYXJyb3d1cCddKSB2eiAtPSAxO1xuICAgIGlmIChrZXlzUmVmLmN1cnJlbnRbJ3MnXSB8fCBrZXlzUmVmLmN1cnJlbnRbJ2Fycm93ZG93biddKSB2eiArPSAxO1xuICAgIGlmIChrZXlzUmVmLmN1cnJlbnRbJ2EnXSB8fCBrZXlzUmVmLmN1cnJlbnRbJ2Fycm93bGVmdCddKSB2eCAtPSAxO1xuICAgIGlmIChrZXlzUmVmLmN1cnJlbnRbJ2QnXSB8fCBrZXlzUmVmLmN1cnJlbnRbJ2Fycm93cmlnaHQnXSkgdnggKz0gMTtcblxuICAgIGNvbnN0IGxlbiA9IE1hdGguaHlwb3QodngsIHZ6KTtcbiAgICBpZiAobGVuID4gMCkge1xuICAgICAgdnggLz0gbGVuO1xuICAgICAgdnogLz0gbGVuO1xuICAgIH1cblxuICAgIHNldFZlbG9jaXR5KHByZXYgPT4gKHtcbiAgICAgIHg6IHByZXYueCAqIGZyaWN0aW9uICsgdnggKiBzcGVlZCAqIGRlbHRhLFxuICAgICAgejogcHJldi56ICogZnJpY3Rpb24gKyB2eiAqIHNwZWVkICogZGVsdGEsXG4gICAgfSkpO1xuXG4gICAgc2V0UG9zaXRpb24ocHJldiA9PiB7XG4gICAgICBjb25zdCBuZXdYID0gVEhSRUUuTWF0aFV0aWxzLmNsYW1wKHByZXYueCArIHZlbG9jaXR5LnggKiBkZWx0YSwgLW1heFgsIG1heFgpO1xuICAgICAgY29uc3QgbmV3WiA9IFRIUkVFLk1hdGhVdGlscy5jbGFtcChwcmV2LnogKyB2ZWxvY2l0eS56ICogZGVsdGEsIC01LCBtYXhaKTtcbiAgICAgIHJldHVybiB7IC4uLnByZXYsIHg6IG5ld1gsIHo6IG5ld1ogfTtcbiAgICB9KTtcblxuICAgIC8vIEF1dG8tcHJvZ3Jlc3MgdG93YXJkIG5leHQgc2tpbGwgd2hlbiBjbG9zZVxuICAgIGNvbnN0IHRhcmdldFNraWxsID0gU0tJTExfU1RPUFNbdGFyZ2V0U2tpbGxJbmRleF07XG4gICAgaWYgKHRhcmdldFNraWxsKSB7XG4gICAgICBjb25zdCBkaXN0YW5jZVRvVGFyZ2V0ID0gTWF0aC5oeXBvdChcbiAgICAgICAgcG9zaXRpb24ueCAtIHRhcmdldFNraWxsLngsXG4gICAgICAgIHBvc2l0aW9uLnogLSB0YXJnZXRTa2lsbC56XG4gICAgICApO1xuICAgICAgaWYgKGRpc3RhbmNlVG9UYXJnZXQgPCAzICYmIHRhcmdldFNraWxsSW5kZXggPCBTS0lMTF9TVE9QUy5sZW5ndGggLSAxKSB7XG4gICAgICAgIHNldFRhcmdldFNraWxsSW5kZXgocHJldiA9PiBwcmV2ICsgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNoYXJhY3RlclJlZi5jdXJyZW50KSB7XG4gICAgICBjaGFyYWN0ZXJSZWYuY3VycmVudC5wb3NpdGlvbi5sZXJwKFxuICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMyhwb3NpdGlvbi54LCBwb3NpdGlvbi55LCBwb3NpdGlvbi56KSxcbiAgICAgICAgMC4wOFxuICAgICAgKTtcblxuICAgICAgaWYgKHZlbG9jaXR5LnggIT09IDAgfHwgdmVsb2NpdHkueiAhPT0gMCkge1xuICAgICAgICBjb25zdCB0YXJnZXRSb3RhdGlvbiA9IE1hdGguYXRhbjIodmVsb2NpdHkueCwgdmVsb2NpdHkueik7XG4gICAgICAgIGNoYXJhY3RlclJlZi5jdXJyZW50LnJvdGF0aW9uLnkgPSBUSFJFRS5NYXRoVXRpbHMubGVycChcbiAgICAgICAgICBjaGFyYWN0ZXJSZWYuY3VycmVudC5yb3RhdGlvbi55LFxuICAgICAgICAgIHRhcmdldFJvdGF0aW9uLFxuICAgICAgICAgIDAuMDhcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiAoXG4gICAgPGdyb3VwIHJlZj17Y2hhcmFjdGVyUmVmfSBwb3NpdGlvbj17W3Bvc2l0aW9uLngsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnpdfT5cbiAgICAgIHsvKiBNYWluIGNsb3VkIGJvZHkgKi99XG4gICAgICA8bWVzaCBjYXN0U2hhZG93PlxuICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEuNCwgMTQsIDEwXX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjZmZmZmZmXCJcbiAgICAgICAgICByb3VnaG5lc3M9ezAuM31cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMX1cbiAgICAgICAgICB0cmFuc3BhcmVudFxuICAgICAgICAgIG9wYWNpdHk9ezAuOTJ9XG4gICAgICAgIC8+XG4gICAgICA8L21lc2g+XG4gICAgICB7LyogTG93ZXIgY2xvdWQgcHVmZiAqL31cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcG9zaXRpb249e1swLCAxLjIsIDBdfSBzY2FsZT17WzEuMSwgMC45LCAxLjFdfT5cbiAgICAgICAgPHNwaGVyZUdlb21ldHJ5IGFyZ3M9e1sxLjAsIDEyLCA4XX0gLz5cbiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsXG4gICAgICAgICAgY29sb3I9XCIjZmZmZmZmXCJcbiAgICAgICAgICByb3VnaG5lc3M9ezAuM31cbiAgICAgICAgICBtZXRhbG5lc3M9ezAuMX1cbiAgICAgICAgICB0cmFuc3BhcmVudFxuICAgICAgICAgIG9wYWNpdHk9ezAuOX1cbiAgICAgICAgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIHsvKiBFeWVzIC0gc2ltcGxlIGRhcmsgc3BoZXJlcyAqL31cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcG9zaXRpb249e1stMC4zLCAxLjUsIDAuNl19IHNjYWxlPXtbMC4xNSwgMC4xNSwgMC4xNV19PlxuICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDgsIDZdfSAvPlxuICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9XCIjMDAwMDAwXCIgLz5cbiAgICAgIDwvbWVzaD5cbiAgICAgIDxtZXNoIGNhc3RTaGFkb3cgcG9zaXRpb249e1swLjMsIDEuNSwgMC42XX0gc2NhbGU9e1swLjE1LCAwLjE1LCAwLjE1XX0+XG4gICAgICAgIDxzcGhlcmVHZW9tZXRyeSBhcmdzPXtbMSwgOCwgNl19IC8+XG4gICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbCBjb2xvcj1cIiMwMDAwMDBcIiAvPlxuICAgICAgPC9tZXNoPlxuICAgIDwvZ3JvdXA+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IENsb3VkV29ybGQzRDsiXX0=