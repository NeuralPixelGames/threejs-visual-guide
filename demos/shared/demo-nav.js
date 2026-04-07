( function () {

	const DEMOS = [
		{ cat: 'Geometry', href: 'geometry/primitives.html', title: 'Geometry Primitives' },
		{ cat: 'Materials', href: 'materials/all-materials.html', title: 'All Materials' },
		{ cat: 'Lights', href: 'lights/all-lights.html', title: 'All Light Types' },
		{ cat: 'Objects', href: 'objects/scene-graph.html', title: 'Scene Graph' },
		{ cat: 'Cameras', href: 'cameras/perspective.html', title: 'Perspective Camera' },
		{ cat: 'Cameras', href: 'cameras/orthographic.html', title: 'Orthographic Camera' },
		{ cat: 'Cameras', href: 'cameras/cube.html', title: 'Cube Camera' },
		{ cat: 'Cameras', href: 'cameras/stereo.html', title: 'Stereo Camera' },
		{ cat: 'Textures', href: 'textures/basics-uv.html', title: 'Texture Basics & UV' },
		{ cat: 'Textures', href: 'textures/normal-maps.html', title: 'Normal Maps' },
		{ cat: 'Textures', href: 'textures/pbr-set.html', title: 'PBR Texture Set' },
		{ cat: 'Textures', href: 'textures/cubetexture-skybox.html', title: 'CubeTexture Skybox' },
		{ cat: 'Textures', href: 'textures/video.html', title: 'Video Texture' },
		{ cat: 'Textures', href: 'textures/data.html', title: 'Data Texture' },
		{ cat: 'Textures', href: 'textures/hdr.html', title: 'HDR Environment' },
		{ cat: 'Textures', href: 'textures/compressed.html', title: 'Compressed Textures' },
		{ cat: 'Renderer', href: 'renderer/shadow-types.html', title: 'Shadow Types' },
		{ cat: 'Renderer', href: 'renderer/env-mapping.html', title: 'Environment Mapping' },
		{ cat: 'Renderer', href: 'renderer/tone-mapping.html', title: 'Tone Mapping' },
	{ cat: 'Cameras', href: 'cameras/array.html', title: 'Array Camera' },
	{ cat: 'Renderer', href: 'renderer/anti-aliasing.html', title: 'Anti-Aliasing' },
	{ cat: 'Renderer', href: 'renderer/render-targets.html', title: 'Render Targets' },
	{ cat: 'Renderer', href: 'renderer/webgl-vs-webgpu.html', title: 'WebGL vs WebGPU' },
	{ cat: 'Renderer', href: 'renderer/compute-shaders.html', title: 'Compute Shaders' },
	{ cat: 'Renderer', href: 'renderer/render-pipeline.html', title: 'Render Pipeline' },
	{ cat: 'Post-FX', href: 'postfx/effect-composer.html', title: 'Effect Composer' },
	{ cat: 'Post-FX', href: 'postfx/bloom.html', title: 'Bloom' },
	{ cat: 'Post-FX', href: 'postfx/ssao.html', title: 'SSAO' },
	{ cat: 'Post-FX', href: 'postfx/dof.html', title: 'Depth of Field' },
	{ cat: 'Post-FX', href: 'postfx/film-grain.html', title: 'Film Grain' },
	{ cat: 'Post-FX', href: 'postfx/glitch.html', title: 'Glitch' },
	{ cat: 'Post-FX', href: 'postfx/outline.html', title: 'Outline' },
	{ cat: 'Post-FX', href: 'postfx/color-grading.html', title: 'Color Grading' },
	{ cat: 'Post-FX', href: 'postfx/motion-blur.html', title: 'Motion Blur' },
	{ cat: 'Post-FX', href: 'postfx/god-rays.html', title: 'God Rays' },
	{ cat: 'Post-FX', href: 'postfx/chromatic-aberration.html', title: 'Chromatic Aberration' },
	{ cat: 'Post-FX', href: 'postfx/pixel-retro.html', title: 'Pixel / Retro' },
	];

	// Resolve a demo href relative to demos/ root.
	// Since each demo lives at demos/<category>/<file>.html,
	// we go up one level ("..") to reach demos/, then append the href.
	function resolve( href ) {

		return '../' + href;

	}

	function findCurrent() {

		const path = window.location.pathname;

		for ( let i = 0; i < DEMOS.length; i ++ ) {

			const href = DEMOS[ i ].href;
			if ( path.endsWith( href ) || path.endsWith( href.replace( '.html', '' ) ) ) return i;

		}

		return - 1;

	}

	const cur = findCurrent();
	if ( cur === - 1 ) return;

	const prev = cur > 0 ? cur - 1 : DEMOS.length - 1;
	const next = cur < DEMOS.length - 1 ? cur + 1 : 0;
	const demo = DEMOS[ cur ];

	const oldBack = document.getElementById( 'back-btn' );
	if ( oldBack ) oldBack.remove();

	const nav = document.createElement( 'div' );
	nav.id = 'demo-nav';
	nav.innerHTML =
		'<a class="nav-btn nav-guide" href="../../index.html" title="Visual Guide">&#128218;</a>' +
		'<a class="nav-btn nav-hub" href="../index.html" title="Demo Hub">&#9776;</a>' +
		'<a class="nav-btn nav-prev" href="' + resolve( DEMOS[ prev ].href ) + '" title="' + DEMOS[ prev ].title + ' (Alt+&#8592;)">&#9664;</a>' +
		'<div class="nav-center" id="nav-center">' +
			'<span class="nav-cat">' + demo.cat + '</span>' +
			'<span class="nav-title">' + demo.title + '</span>' +
			'<span class="nav-count">' + ( cur + 1 ) + ' / ' + DEMOS.length + '</span>' +
		'</div>' +
		'<a class="nav-btn nav-next" href="' + resolve( DEMOS[ next ].href ) + '" title="' + DEMOS[ next ].title + ' (Alt+&#8594;)">&#9654;</a>';

	document.body.appendChild( nav );

	// Build section progress bar below nav
	const progressBar = document.createElement( 'div' );
	progressBar.id = 'demo-progress';

	// Group demos by category to build segments
	const cats = [];
	const catMap = {};

	DEMOS.forEach( ( d, i ) => {

		if ( ! catMap[ d.cat ] ) {

			catMap[ d.cat ] = { cat: d.cat, start: i, count: 0 };
			cats.push( catMap[ d.cat ] );

		}

		catMap[ d.cat ].count ++;

	} );

	const catColors = [ '#4a9eff', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#38bdf8' ];

	cats.forEach( ( c, ci ) => {

		const seg = document.createElement( 'a' );
		seg.className = 'progress-seg';
		seg.title = c.cat;
		seg.href = resolve( DEMOS[ c.start ].href );
		seg.style.flex = c.count;
		const color = catColors[ ci % catColors.length ];
		const isCurrent = demo.cat === c.cat;
		seg.style.background = isCurrent ? color : 'rgba(255,255,255,0.08)';
		seg.style.opacity = isCurrent ? '1' : '0.5';

		// Mark the exact current demo within the active segment
		if ( isCurrent ) {

			const inner = document.createElement( 'span' );
			inner.className = 'progress-pos';
			const posInCat = cur - c.start;
			const pct = c.count === 1 ? 50 : ( posInCat / ( c.count - 1 ) ) * 100;
			inner.style.left = pct + '%';
			seg.appendChild( inner );

		}

		progressBar.appendChild( seg );

	} );

	document.body.appendChild( progressBar );

	const panel = document.createElement( 'div' );
	panel.id = 'demo-panel';
	panel.className = 'hidden';

	let panelHTML = '<div class="panel-header"><input type="text" id="panel-search" placeholder="Search demos..." autocomplete="off"><button id="panel-close">&#10005;</button></div><div class="panel-list" id="panel-list">';

	let lastCat = '';

	DEMOS.forEach( ( d, i ) => {

		if ( d.cat !== lastCat ) {

			lastCat = d.cat;
			panelHTML += '<div class="panel-cat">' + d.cat + '</div>';

		}

		const active = i === cur ? ' panel-active' : '';
		panelHTML += '<a class="panel-item' + active + '" href="' + resolve( d.href ) + '">' + d.title + '</a>';

	} );

	panelHTML += '</div>';
	panel.innerHTML = panelHTML;
	document.body.appendChild( panel );

	const center = document.getElementById( 'nav-center' );

	center.addEventListener( 'click', function () {

		panel.classList.toggle( 'hidden' );
		if ( ! panel.classList.contains( 'hidden' ) ) {

			document.getElementById( 'panel-search' ).focus();
			const active = panel.querySelector( '.panel-active' );
			if ( active ) active.scrollIntoView( { block: 'center' } );

		}

	} );

	document.getElementById( 'panel-close' ).addEventListener( 'click', function () {

		panel.classList.add( 'hidden' );

	} );

	document.getElementById( 'panel-search' ).addEventListener( 'input', function ( e ) {

		const q = e.target.value.toLowerCase();
		const items = panel.querySelectorAll( '.panel-item' );
		const cats = panel.querySelectorAll( '.panel-cat' );

		cats.forEach( c => c.style.display = q ? 'none' : '' );

		items.forEach( item => {

			const match = item.textContent.toLowerCase().includes( q );
			item.style.display = match ? '' : 'none';

		} );

	} );

	document.addEventListener( 'keydown', function ( e ) {

		if ( e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ) return;

		if ( e.altKey && e.key === 'ArrowLeft' ) {

			e.preventDefault();
			window.location.href = resolve( DEMOS[ prev ].href );

		} else if ( e.altKey && e.key === 'ArrowRight' ) {

			e.preventDefault();
			window.location.href = resolve( DEMOS[ next ].href );

		} else if ( e.key === 'Escape' ) {

			if ( ! panel.classList.contains( 'hidden' ) ) {

				panel.classList.add( 'hidden' );

			}

		}

	} );

	document.addEventListener( 'click', function ( e ) {

		if ( ! panel.classList.contains( 'hidden' ) && ! panel.contains( e.target ) && ! center.contains( e.target ) ) {

			panel.classList.add( 'hidden' );

		}

	} );

	const style = document.createElement( 'style' );
	style.textContent = `
		#demo-nav {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			height: 42px;
			background: rgba(7, 11, 20, 0.94);
			backdrop-filter: blur(16px) saturate(1.4);
			border-bottom: 1px solid rgba(74, 158, 255, 0.12);
			display: flex;
			align-items: center;
			z-index: 1000;
			font-family: 'Inter', system-ui, -apple-system, sans-serif;
			user-select: none;
			animation: navSlideIn 0.4s ease-out;
		}
		@keyframes navSlideIn {
			from { transform: translateY(-100%); opacity: 0; }
			to { transform: translateY(0); opacity: 1; }
		}
		.nav-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 42px;
			height: 42px;
			color: #6b7394;
			text-decoration: none;
			font-size: 12px;
			transition: all 0.15s;
			flex-shrink: 0;
		}
		.nav-prev, .nav-next {
			color: #c8d0e0;
			font-size: 14px;
		}
		.nav-btn:hover {
			color: #4a9eff;
			background: rgba(74, 158, 255, 0.1);
			text-decoration: none;
			text-shadow: 0 0 8px rgba(74, 158, 255, 0.4);
		}
		.nav-prev:hover, .nav-next:hover {
			color: #6ec6ff;
			text-shadow: 0 0 12px rgba(74, 158, 255, 0.6);
		}
		.nav-guide { font-size: 16px; }
		.nav-hub { font-size: 16px; }
		.nav-center {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10px;
			cursor: pointer;
			height: 100%;
			padding: 0 8px;
			transition: background 0.15s;
			overflow: hidden;
			min-width: 0;
		}
		.nav-center:hover { background: rgba(74, 158, 255, 0.06); }
		.nav-cat {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 1.5px;
			color: #4a9eff;
			font-weight: 600;
			flex-shrink: 0;
		}
		.nav-title {
			font-size: 13px;
			color: #e0e5f0;
			font-weight: 500;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.nav-count {
			font-size: 12px;
			color: #8899bb;
			flex-shrink: 0;
		}
		#demo-progress {
			position: fixed;
			top: 42px;
			left: 0;
			right: 0;
			height: 3px;
			display: flex;
			gap: 2px;
			z-index: 1000;
			background: rgba(7, 11, 20, 0.9);
			padding: 0 1px;
		}
		.progress-seg {
			position: relative;
			height: 100%;
			border-radius: 1px;
			transition: opacity 0.2s, background 0.2s;
			text-decoration: none;
		}
		.progress-seg:hover {
			opacity: 1 !important;
			filter: brightness(1.3);
		}
		.progress-pos {
			position: absolute;
			top: -1px;
			width: 5px;
			height: 5px;
			background: #fff;
			border-radius: 50%;
			transform: translateX(-50%);
			box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
		}
		#demo-panel {
			position: fixed;
			top: 45px;
			left: 50%;
			transform: translateX(-50%);
			width: 380px;
			max-height: calc(100vh - 60px);
			background: rgba(10, 14, 24, 0.97);
			backdrop-filter: blur(20px) saturate(1.3);
			border: 1px solid rgba(74, 158, 255, 0.18);
			border-top: none;
			border-radius: 0 0 14px 14px;
			z-index: 1001;
			display: flex;
			flex-direction: column;
			box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 1px rgba(74, 158, 255, 0.2);
			overflow: hidden;
			animation: panelDrop 0.25s ease-out;
		}
		@keyframes panelDrop {
			from { transform: translateX(-50%) translateY(-8px); opacity: 0; }
			to { transform: translateX(-50%) translateY(0); opacity: 1; }
		}
		#demo-panel.hidden { display: none; }
		.panel-header {
			display: flex;
			gap: 6px;
			padding: 10px 12px;
			border-bottom: 1px solid #1e2740;
			flex-shrink: 0;
		}
		.panel-header input {
			flex: 1;
			background: #141825;
			border: 1px solid #1e2740;
			border-radius: 6px;
			padding: 6px 10px;
			color: #e0e5f0;
			font-size: 13px;
			font-family: inherit;
			outline: none;
		}
		.panel-header input:focus { border-color: #4a9eff; }
		.panel-header button {
			width: 30px;
			background: none;
			border: 1px solid #1e2740;
			border-radius: 6px;
			color: #6b7394;
			cursor: pointer;
			font-size: 14px;
		}
		.panel-header button:hover { color: #ff6b6b; border-color: #ff6b6b; }
		.panel-list {
			overflow-y: auto;
			padding: 6px 0;
			scrollbar-width: thin;
			scrollbar-color: #1e2740 transparent;
		}
		.panel-cat {
			padding: 8px 16px 4px;
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 1.5px;
			color: #4a9eff;
			font-weight: 600;
		}
		.panel-item {
			display: block;
			padding: 7px 16px 7px 28px;
			color: #b0b8cc;
			text-decoration: none;
			font-size: 13px;
			transition: all 0.1s;
		}
		.panel-item:hover {
			background: rgba(74, 158, 255, 0.1);
			color: #fff;
			text-decoration: none;
			padding-left: 32px;
		}
		.panel-active {
			color: #4a9eff;
			background: rgba(74, 158, 255, 0.08);
			font-weight: 500;
		}
		#info { top: 46px !important; }
		#back-btn { display: none !important; }
		.lil-gui.root { top: 50px !important; }
		@media (max-width: 640px) {
			.nav-cat, .nav-count { display: none; }
			#demo-panel { width: calc(100% - 16px); }
		}

	`;
	document.head.appendChild( style );

	/* -- Load GUI tooltip enhancement -- */

	const guiEnhanceScript = document.createElement( 'script' );
	guiEnhanceScript.src = '../shared/gui-enhance.js';
	guiEnhanceScript.defer = true;
	document.head.appendChild( guiEnhanceScript );

	/* -- Load infographic thumbnail overlay -- */

	const thumbScript = document.createElement( 'script' );
	thumbScript.src = '../shared/infographic-thumb.js';
	thumbScript.defer = true;
	document.head.appendChild( thumbScript );

	/* -- Release WebGL contexts on page unload to prevent context exhaustion -- */

	window.addEventListener( 'beforeunload', function () {

		document.querySelectorAll( 'canvas' ).forEach( function ( canvas ) {

			var gl = canvas.getContext( 'webgl2' ) || canvas.getContext( 'webgl' );
			if ( gl ) {

				var ext = gl.getExtension( 'WEBGL_lose_context' );
				if ( ext ) ext.loseContext();

			}

		} );

	} );

	window.addEventListener( 'pagehide', function () {

		document.querySelectorAll( 'canvas' ).forEach( function ( canvas ) {

			var gl = canvas.getContext( 'webgl2' ) || canvas.getContext( 'webgl' );
			if ( gl ) {

				var ext = gl.getExtension( 'WEBGL_lose_context' );
				if ( ext ) ext.loseContext();

			}

		} );

	} );

} )();
