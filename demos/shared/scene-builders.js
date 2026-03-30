import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new HDRLoader();
const gltfLoader = new GLTFLoader();

// ── Shared texture cache ──

const textureCache = {};

// ── Shared model cache ──

const modelCache = {};

function loadModel( path ) {

	if ( modelCache[ path ] ) return modelCache[ path ];
	const promise = new Promise( ( resolve ) => {

		gltfLoader.load(
			path,
			( gltf ) => resolve( gltf.scene ),
			undefined,
			() => resolve( null )
		);

	} );
	modelCache[ path ] = promise;
	return promise;

}

function loadTexture( path, opts = {} ) {

	if ( textureCache[ path ] ) return textureCache[ path ];
	const tex = textureLoader.load( path );
	if ( opts.wrapS ) tex.wrapS = opts.wrapS;
	if ( opts.wrapT ) tex.wrapT = opts.wrapT;
	if ( opts.repeat ) tex.repeat.set( opts.repeat[ 0 ], opts.repeat[ 1 ] );
	tex.colorSpace = opts.colorSpace || THREE.SRGBColorSpace;
	textureCache[ path ] = tex;
	return tex;

}

/**
 * Load HDR environment map and set as scene.environment (and optionally scene.background).
 * Returns a Promise that resolves to the env texture.
 */
export function loadHDREnvironment( renderer, scene, hdrPath, opts = {} ) {

	const pmremGenerator = new THREE.PMREMGenerator( renderer );
	pmremGenerator.compileEquirectangularShader();

	return new Promise( ( resolve ) => {

		rgbeLoader.load( hdrPath, ( hdrTexture ) => {

			const envMap = pmremGenerator.fromEquirectangular( hdrTexture ).texture;
			scene.environment = envMap;
			if ( opts.background ) scene.background = envMap;
			hdrTexture.dispose();
			pmremGenerator.dispose();
			resolve( envMap );

		} );

	} );

}

// ── Asset base paths ──

const TEXTURES = '../../examples/textures/';
const EQUIRECT = TEXTURES + 'equirectangular/';
const MODELS = '../assets/models/';

// ════════════════════════════════════════════════════════════════
// 1. CYBERPUNK ALLEY — bloom, effect-composer, color-grading, glitch, pixel-retro
// ════════════════════════════════════════════════════════════════

export function buildCyberpunkAlley( scene, renderer, opts = {} ) {

	const {
		alleyLength = 40,
		alleyWidth = 6,
		buildingHeight = 12,
		wetGround = true,
		particles = true
	} = opts;

	const result = { neonSigns: [], lights: [], buildings: [], ground: null };

	// HDR env for ambient reflections
	loadHDREnvironment( renderer, scene, EQUIRECT + 'moonless_golf_1k.hdr' );

	// Fog
	scene.fog = new THREE.FogExp2( 0x050810, 0.035 );

	// ── Ground ──
	const brickDiffuse = loadTexture( TEXTURES + 'brick_diffuse.jpg', {
		wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
		repeat: [ 8, 20 ]
	} );
	const brickBump = loadTexture( TEXTURES + 'brick_bump.jpg', {
		wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
		repeat: [ 8, 20 ], colorSpace: THREE.NoColorSpace
	} );
	const brickRoughness = loadTexture( TEXTURES + 'brick_roughness.jpg', {
		wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
		repeat: [ 8, 20 ], colorSpace: THREE.NoColorSpace
	} );

	const groundMat = wetGround
		? new THREE.MeshStandardMaterial( {
			color: 0x111111, roughness: 0.15, metalness: 0.85
		} )
		: new THREE.MeshStandardMaterial( {
			color: 0x222222, roughness: 0.8, metalness: 0.1
		} );

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry( alleyWidth + 2, alleyLength ),
		groundMat
	);
	ground.rotation.x = - Math.PI / 2;
	ground.position.z = - alleyLength / 2 + 5;
	ground.receiveShadow = true;
	scene.add( ground );
	result.ground = ground;

	// ── Walls ──
	const wallMat = new THREE.MeshStandardMaterial( {
		map: brickDiffuse,
		bumpMap: brickBump,
		bumpScale: 0.3,
		roughnessMap: brickRoughness,
		roughness: 0.9,
		metalness: 0.0
	} );

	for ( let side = - 1; side <= 1; side += 2 ) {

		// Main wall
		const wall = new THREE.Mesh(
			new THREE.BoxGeometry( 0.4, buildingHeight, alleyLength ),
			wallMat
		);
		wall.position.set( side * ( alleyWidth / 2 ), buildingHeight / 2, - alleyLength / 2 + 5 );
		wall.castShadow = true;
		wall.receiveShadow = true;
		scene.add( wall );
		result.buildings.push( wall );

		// Upper building extensions
		for ( let i = 0; i < 3; i ++ ) {

			const extH = 4 + Math.random() * 8;
			const extD = 1.5 + Math.random() * 2;
			const ext = new THREE.Mesh(
				new THREE.BoxGeometry( extD, extH, 6 + Math.random() * 8 ),
				new THREE.MeshStandardMaterial( {
					color: new THREE.Color().setHSL( 0, 0, 0.05 + Math.random() * 0.08 ),
					roughness: 0.85, metalness: 0.1
				} )
			);
			ext.position.set(
				side * ( alleyWidth / 2 + extD / 2 + 0.2 ),
				buildingHeight + extH / 2 - 2,
				- 5 + i * 12 - alleyLength / 2 + 5
			);
			ext.castShadow = true;
			scene.add( ext );
			result.buildings.push( ext );

		}

		// Windows on walls
		for ( let wy = 0; wy < 3; wy ++ ) {

			for ( let wz = 0; wz < 5; wz ++ ) {

				if ( Math.random() < 0.3 ) continue; // some windows dark
				const winGeo = new THREE.PlaneGeometry( 0.6, 0.8 );
				const winColor = Math.random() < 0.5 ? 0xffeebb : 0xaaccff;
				const winMat = new THREE.MeshStandardMaterial( {
					color: winColor, emissive: winColor,
					emissiveIntensity: 0.3 + Math.random() * 0.5,
					roughness: 0.3
				} );
				const win = new THREE.Mesh( winGeo, winMat );
				win.position.set(
					side * ( alleyWidth / 2 - 0.01 ),
					3 + wy * 3,
					- 3 + wz * 7 - alleyLength / 2 + 5
				);
				win.rotation.y = side > 0 ? - Math.PI / 2 : Math.PI / 2;
				scene.add( win );

			}

		}

	}

	// ── Neon signs ──
	const neonDefs = [
		{ text: 'OPEN', color: 0xff1493, x: - 2.6, y: 4, z: 0 },
		{ text: 'BAR', color: 0x00d4ff, x: 2.5, y: 5.5, z: - 8 },
		{ text: '24/7', color: 0xffcc00, x: - 2.4, y: 3.5, z: - 16 }
	];

	neonDefs.forEach( ( def ) => {

		// Sign backing
		const backGeo = new THREE.BoxGeometry( 1.8, 0.6, 0.1 );
		const backMat = new THREE.MeshStandardMaterial( { color: 0x111111, roughness: 0.9 } );
		const back = new THREE.Mesh( backGeo, backMat );
		back.position.set( def.x, def.y, def.z );
		back.rotation.y = def.x < 0 ? Math.PI / 6 : - Math.PI / 6;
		scene.add( back );

		// Neon glow tube
		const tubeGeo = new THREE.BoxGeometry( 1.6, 0.4, 0.08 );
		const tubeMat = new THREE.MeshStandardMaterial( {
			color: def.color,
			emissive: def.color,
			emissiveIntensity: 3.0,
			roughness: 0.2,
			metalness: 0.0
		} );
		const tube = new THREE.Mesh( tubeGeo, tubeMat );
		tube.position.copy( back.position );
		tube.position.z += ( def.x < 0 ? 0.08 : - 0.08 );
		tube.rotation.copy( back.rotation );
		scene.add( tube );

		// Point light matching neon color
		const neonLight = new THREE.PointLight( def.color, 4, 10, 2 );
		neonLight.position.copy( tube.position );
		scene.add( neonLight );

		result.neonSigns.push( { back, tube, light: neonLight, color: def.color } );
		result.lights.push( neonLight );

	} );

	// ── Streetlamp ──
	const poleGeo = new THREE.CylinderGeometry( 0.04, 0.06, 5, 8 );
	const poleMat = new THREE.MeshStandardMaterial( { color: 0x333333, roughness: 0.5, metalness: 0.8 } );
	const pole = new THREE.Mesh( poleGeo, poleMat );
	pole.position.set( 1.5, 2.5, - alleyLength + 10 );
	scene.add( pole );

	const lampGeo = new THREE.SphereGeometry( 0.15, 16, 8 );
	const lampMat = new THREE.MeshStandardMaterial( {
		color: 0xffffff, emissive: 0xffeedd, emissiveIntensity: 5.0
	} );
	const lamp = new THREE.Mesh( lampGeo, lampMat );
	lamp.position.set( 1.5, 5.2, - alleyLength + 10 );
	scene.add( lamp );

	const streetLight = new THREE.PointLight( 0xffeedd, 8, 20, 2 );
	streetLight.position.copy( lamp.position );
	streetLight.castShadow = true;
	streetLight.shadow.mapSize.setScalar( 1024 );
	scene.add( streetLight );
	result.lights.push( streetLight );

	// ── Vending machine ──
	const vendGeo = new THREE.BoxGeometry( 0.8, 1.6, 0.5 );
	const vendMat = new THREE.MeshStandardMaterial( {
		color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 1.0,
		roughness: 0.3, metalness: 0.5
	} );
	const vend = new THREE.Mesh( vendGeo, vendMat );
	vend.position.set( 2.5, 0.8, - 4 );
	scene.add( vend );

	const vendLight = new THREE.PointLight( 0xff6600, 2, 8, 2 );
	vendLight.position.set( 2.2, 1.0, - 4 );
	scene.add( vendLight );
	result.lights.push( vendLight );

	// ── Ambient key light ──
	const ambientLight = new THREE.AmbientLight( 0x1a1a2e, 0.3 );
	scene.add( ambientLight );

	// ── Dust particles ──
	if ( particles ) {

		const dustCount = 500;
		const dustGeo = new THREE.BufferGeometry();
		const dustPos = new Float32Array( dustCount * 3 );
		for ( let i = 0; i < dustCount; i ++ ) {

			dustPos[ i * 3 ] = ( Math.random() - 0.5 ) * alleyWidth;
			dustPos[ i * 3 + 1 ] = Math.random() * buildingHeight;
			dustPos[ i * 3 + 2 ] = Math.random() * alleyLength - alleyLength / 2;

		}

		dustGeo.setAttribute( 'position', new THREE.BufferAttribute( dustPos, 3 ) );
		const dustMat = new THREE.PointsMaterial( {
			color: 0xaabbcc, size: 0.03, transparent: true, opacity: 0.4,
			sizeAttenuation: true
		} );
		const dust = new THREE.Points( dustGeo, dustMat );
		scene.add( dust );
		result.dust = dust;

	}

	return result;

}

// ════════════════════════════════════════════════════════════════
// 2. CHESS SCENE — dof, orthographic camera
// ════════════════════════════════════════════════════════════════

export function buildChessScene( scene, renderer, opts = {} ) {

	const {
		fullSet = true,
		tableVisible = true,
		background = true
	} = opts;

	const result = { pieces: [], board: null, table: null };

	loadHDREnvironment( renderer, scene, EQUIRECT + 'venice_sunset_1k.hdr' );
	scene.fog = new THREE.FogExp2( 0x0a0e1a, 0.04 );

	// ── Table ──
	if ( tableVisible ) {

		const woodDiffuse = loadTexture( TEXTURES + 'hardwood2_diffuse.jpg', {
			wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: [ 2, 2 ]
		} );
		const woodBump = loadTexture( TEXTURES + 'hardwood2_bump.jpg', {
			wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
			repeat: [ 2, 2 ], colorSpace: THREE.NoColorSpace
		} );
		const woodRoughness = loadTexture( TEXTURES + 'hardwood2_roughness.jpg', {
			wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
			repeat: [ 2, 2 ], colorSpace: THREE.NoColorSpace
		} );

		const tableMat = new THREE.MeshStandardMaterial( {
			map: woodDiffuse, bumpMap: woodBump, bumpScale: 0.2,
			roughnessMap: woodRoughness, roughness: 0.6, metalness: 0.0
		} );

		const tableTop = new THREE.Mesh( new THREE.BoxGeometry( 5, 0.15, 3.5 ), tableMat );
		tableTop.position.set( 0, 0.9, 0 );
		tableTop.receiveShadow = true;
		scene.add( tableTop );
		result.table = tableTop;

		// Table legs
		const legGeo = new THREE.CylinderGeometry( 0.08, 0.08, 0.9, 8 );
		const legMat = new THREE.MeshStandardMaterial( { color: 0x4a3728, roughness: 0.7 } );
		[ [ - 2, - 1.4 ], [ 2, - 1.4 ], [ - 2, 1.4 ], [ 2, 1.4 ] ].forEach( ( [ lx, lz ] ) => {

			const leg = new THREE.Mesh( legGeo, legMat );
			leg.position.set( lx, 0.45, lz );
			scene.add( leg );

		} );

	}

	// ── Board + Pieces ──
	const boardY = tableVisible ? 1.0 : 0;
	const boardGroup = new THREE.Group();
	boardGroup.position.y = boardY;
	scene.add( boardGroup );
	result.board = boardGroup;

	// ── Procedural fallback (renders immediately) ──
	const proceduralGroup = new THREE.Group();
	boardGroup.add( proceduralGroup );

	const squareSize = 0.3;
	const whiteMat = new THREE.MeshStandardMaterial( {
		color: 0xf0e6d0, roughness: 0.25, metalness: 0.0
	} );
	const blackMat = new THREE.MeshStandardMaterial( {
		color: 0x1a1a2a, roughness: 0.3, metalness: 0.1
	} );
	const squareGeo = new THREE.BoxGeometry( squareSize, 0.05, squareSize );

	for ( let row = 0; row < 8; row ++ ) {

		for ( let col = 0; col < 8; col ++ ) {

			const sq = new THREE.Mesh( squareGeo, ( row + col ) % 2 === 0 ? whiteMat : blackMat );
			sq.position.set(
				( col - 3.5 ) * squareSize,
				0,
				( row - 3.5 ) * squareSize
			);
			sq.receiveShadow = true;
			proceduralGroup.add( sq );

		}

	}

	// Board border
	const borderGeo = new THREE.BoxGeometry( 8 * squareSize + 0.2, 0.08, 8 * squareSize + 0.2 );
	const borderMat = new THREE.MeshStandardMaterial( { color: 0x2a1f14, roughness: 0.5, metalness: 0.3 } );
	const border = new THREE.Mesh( borderGeo, borderMat );
	border.position.y = - 0.04;
	proceduralGroup.add( border );

	// Procedural chess pieces
	const whitePieceMat = new THREE.MeshStandardMaterial( {
		color: 0xf5f0e8, roughness: 0.2, metalness: 0.1
	} );
	const blackPieceMat = new THREE.MeshStandardMaterial( {
		color: 0x1a1a1a, roughness: 0.15, metalness: 0.2
	} );

	function addPiece( type, col, row, isWhite ) {

		const mat = isWhite ? whitePieceMat : blackPieceMat;
		const x = ( col - 3.5 ) * squareSize;
		const z = ( row - 3.5 ) * squareSize;
		let piece;

		if ( type === 'pawn' ) {

			const group = new THREE.Group();
			group.add( new THREE.Mesh( new THREE.CylinderGeometry( 0.06, 0.08, 0.04, 16 ), mat ) );
			const body = new THREE.Mesh( new THREE.CylinderGeometry( 0.03, 0.06, 0.12, 16 ), mat );
			body.position.y = 0.08;
			group.add( body );
			const head = new THREE.Mesh( new THREE.SphereGeometry( 0.04, 16, 8 ), mat );
			head.position.y = 0.16;
			group.add( head );
			piece = group;

		} else if ( type === 'rook' ) {

			const group = new THREE.Group();
			group.add( new THREE.Mesh( new THREE.CylinderGeometry( 0.07, 0.09, 0.05, 16 ), mat ) );
			const tower = new THREE.Mesh( new THREE.CylinderGeometry( 0.05, 0.07, 0.2, 16 ), mat );
			tower.position.y = 0.12;
			group.add( tower );
			const top = new THREE.Mesh( new THREE.CylinderGeometry( 0.07, 0.05, 0.06, 16 ), mat );
			top.position.y = 0.25;
			group.add( top );
			piece = group;

		} else if ( type === 'knight' ) {

			const group = new THREE.Group();
			group.add( new THREE.Mesh( new THREE.CylinderGeometry( 0.07, 0.09, 0.05, 16 ), mat ) );
			const body = new THREE.Mesh( new THREE.BoxGeometry( 0.06, 0.22, 0.1 ), mat );
			body.position.set( 0, 0.14, 0.01 );
			body.rotation.z = 0.15;
			group.add( body );
			const head = new THREE.Mesh( new THREE.BoxGeometry( 0.05, 0.08, 0.14 ), mat );
			head.position.set( 0.02, 0.26, 0.03 );
			head.rotation.z = 0.3;
			group.add( head );
			piece = group;

		} else if ( type === 'bishop' ) {

			const group = new THREE.Group();
			group.add( new THREE.Mesh( new THREE.CylinderGeometry( 0.06, 0.08, 0.04, 16 ), mat ) );
			const body = new THREE.Mesh( new THREE.CylinderGeometry( 0.02, 0.06, 0.2, 16 ), mat );
			body.position.y = 0.12;
			group.add( body );
			const tip = new THREE.Mesh( new THREE.SphereGeometry( 0.035, 16, 8 ), mat );
			tip.position.y = 0.24;
			group.add( tip );
			const point = new THREE.Mesh( new THREE.ConeGeometry( 0.015, 0.05, 8 ), mat );
			point.position.y = 0.29;
			group.add( point );
			piece = group;

		} else if ( type === 'queen' ) {

			const group = new THREE.Group();
			group.add( new THREE.Mesh( new THREE.CylinderGeometry( 0.07, 0.09, 0.05, 16 ), mat ) );
			const body = new THREE.Mesh( new THREE.CylinderGeometry( 0.03, 0.07, 0.25, 16 ), mat );
			body.position.y = 0.15;
			group.add( body );
			const crown = new THREE.Mesh( new THREE.SphereGeometry( 0.05, 16, 8 ), mat );
			crown.position.y = 0.3;
			group.add( crown );
			const jewel = new THREE.Mesh( new THREE.SphereGeometry( 0.015, 8, 4 ),
				new THREE.MeshStandardMaterial( { color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 0.5, roughness: 0.1 } )
			);
			jewel.position.y = 0.35;
			group.add( jewel );
			piece = group;

		} else if ( type === 'king' ) {

			const group = new THREE.Group();
			group.add( new THREE.Mesh( new THREE.CylinderGeometry( 0.07, 0.09, 0.05, 16 ), mat ) );
			const body = new THREE.Mesh( new THREE.CylinderGeometry( 0.03, 0.07, 0.28, 16 ), mat );
			body.position.y = 0.17;
			group.add( body );
			const crossV = new THREE.Mesh( new THREE.BoxGeometry( 0.02, 0.1, 0.02 ), mat );
			crossV.position.y = 0.37;
			group.add( crossV );
			const crossH = new THREE.Mesh( new THREE.BoxGeometry( 0.06, 0.02, 0.02 ), mat );
			crossH.position.y = 0.35;
			group.add( crossH );
			piece = group;

		}

		if ( piece ) {

			piece.position.set( x, 0.025, z );
			piece.traverse( ( c ) => { if ( c.isMesh ) { c.castShadow = true; c.receiveShadow = true; } } );
			proceduralGroup.add( piece );
			result.pieces.push( piece );

		}

	}

	if ( fullSet ) {

		// White pieces
		for ( let i = 0; i < 8; i ++ ) addPiece( 'pawn', i, 1, true );
		addPiece( 'rook', 0, 0, true ); addPiece( 'rook', 7, 0, true );
		addPiece( 'knight', 1, 0, true ); addPiece( 'knight', 6, 0, true );
		addPiece( 'bishop', 2, 0, true ); addPiece( 'bishop', 5, 0, true );
		addPiece( 'queen', 3, 0, true ); addPiece( 'king', 4, 0, true );

		// Black pieces
		for ( let i = 0; i < 8; i ++ ) addPiece( 'pawn', i, 6, false );
		addPiece( 'rook', 0, 7, false ); addPiece( 'rook', 7, 7, false );
		addPiece( 'knight', 1, 7, false ); addPiece( 'knight', 6, 7, false );
		addPiece( 'bishop', 2, 7, false ); addPiece( 'bishop', 5, 7, false );
		addPiece( 'queen', 3, 7, false ); addPiece( 'king', 4, 7, false );

	}

	// ── Poly Haven chess set (async upgrade) ──
	// Poly Haven model board spans ~0.554 units; procedural board spans 2.4 units
	const CHESS_MODEL_SCALE = 2.4 / 0.554;

	loadModel( MODELS + 'chess-set/chess_set_1k.gltf' ).then( ( model ) => {

		if ( ! model ) return;

		model.scale.setScalar( CHESS_MODEL_SCALE );
		model.traverse( ( c ) => {

			if ( c.isMesh ) {

				c.castShadow = true;
				c.receiveShadow = true;

			}

		} );

		boardGroup.add( model );

		// Hide procedural fallback now that the real model is loaded
		proceduralGroup.visible = false;

		// Update result.pieces with the loaded model's piece meshes
		result.pieces.length = 0;
		model.traverse( ( c ) => {

			if ( c.isMesh && c.name !== 'board' ) {

				result.pieces.push( c );

			}

		} );

	} );

	// ── Background ──
	if ( background ) {

		// Bookshelf
		const shelfMat = new THREE.MeshStandardMaterial( { color: 0x3a2a1a, roughness: 0.7 } );
		const shelf = new THREE.Mesh( new THREE.BoxGeometry( 2, 2.5, 0.4 ), shelfMat );
		shelf.position.set( - 3, 1.25, - 3 );
		scene.add( shelf );

		// Books on shelf
		for ( let i = 0; i < 8; i ++ ) {

			const bookColor = new THREE.Color().setHSL( Math.random(), 0.5, 0.3 );
			const book = new THREE.Mesh(
				new THREE.BoxGeometry( 0.08 + Math.random() * 0.04, 0.2 + Math.random() * 0.1, 0.2 ),
				new THREE.MeshStandardMaterial( { color: bookColor, roughness: 0.8 } )
			);
			book.position.set( - 3.5 + i * 0.15, 2.1, - 2.85 );
			scene.add( book );

		}

		// Window
		const winMat = new THREE.MeshStandardMaterial( {
			color: 0x88aacc, emissive: 0x88aacc, emissiveIntensity: 0.8
		} );
		const window_ = new THREE.Mesh( new THREE.PlaneGeometry( 1.5, 1.8 ), winMat );
		window_.position.set( 3, 1.5, - 3 );
		scene.add( window_ );

	}

	// ── Lighting ──
	scene.add( new THREE.AmbientLight( 0x404060, 0.5 ) );

	const keyLight = new THREE.DirectionalLight( 0xfff5e0, 2.0 );
	keyLight.position.set( 3, 6, 3 );
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.setScalar( 2048 );
	keyLight.shadow.camera.left = - 3;
	keyLight.shadow.camera.right = 3;
	keyLight.shadow.camera.top = 3;
	keyLight.shadow.camera.bottom = - 3;
	scene.add( keyLight );

	// Warm table lamp
	const warmLight = new THREE.PointLight( 0xffcc88, 3, 8, 2 );
	warmLight.position.set( - 1, 2.5, 1 );
	scene.add( warmLight );

	return result;

}

// ════════════════════════════════════════════════════════════════
// 3. CITY STREET — perspective camera, map controls, lensflare
// ════════════════════════════════════════════════════════════════

export function buildCityStreet( scene, renderer, opts = {} ) {

	const {
		streetLength = 60,
		buildingCount = 20,
		vehicleCount = 6,
		timeOfDay = 'evening'
	} = opts;

	const result = { buildings: [], vehicles: [], lights: [], road: null };

	loadHDREnvironment( renderer, scene, EQUIRECT + '752-hdri-skies-com_1k.hdr' );
	scene.fog = new THREE.FogExp2( 0x0a0e1a, 0.012 );

	// ── Road ──
	const roadMat = new THREE.MeshStandardMaterial( { color: 0x222222, roughness: 0.9 } );
	const road = new THREE.Mesh(
		new THREE.PlaneGeometry( 10, streetLength ),
		roadMat
	);
	road.rotation.x = - Math.PI / 2;
	road.receiveShadow = true;
	scene.add( road );
	result.road = road;

	// Lane markings
	const markingMat = new THREE.MeshStandardMaterial( {
		color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.2
	} );
	for ( let i = 0; i < streetLength / 4; i ++ ) {

		const dash = new THREE.Mesh(
			new THREE.PlaneGeometry( 0.15, 1.5 ),
			markingMat
		);
		dash.rotation.x = - Math.PI / 2;
		dash.position.set( 0, 0.01, - streetLength / 2 + i * 4 + 2 );
		scene.add( dash );

	}

	// Sidewalks
	const sidewalkMat = new THREE.MeshStandardMaterial( { color: 0x444444, roughness: 0.85 } );
	for ( let side = - 1; side <= 1; side += 2 ) {

		const sidewalk = new THREE.Mesh(
			new THREE.BoxGeometry( 3, 0.15, streetLength ),
			sidewalkMat
		);
		sidewalk.position.set( side * 6.5, 0.075, 0 );
		sidewalk.receiveShadow = true;
		scene.add( sidewalk );

	}

	// ── Buildings ──
	for ( let i = 0; i < buildingCount; i ++ ) {

		const side = i % 2 === 0 ? - 1 : 1;
		const depth = 4 + Math.random() * 6;
		const height = 5 + Math.random() * 20;
		const width = 3 + Math.random() * 4;
		const z = - streetLength / 2 + ( i / buildingCount ) * streetLength;

		const hue = Math.random() * 0.1;
		const buildMat = new THREE.MeshStandardMaterial( {
			color: new THREE.Color().setHSL( hue, 0.1, 0.08 + Math.random() * 0.06 ),
			roughness: 0.8, metalness: 0.1
		} );

		const building = new THREE.Mesh(
			new THREE.BoxGeometry( width, height, depth ),
			buildMat
		);
		building.position.set(
			side * ( 8 + depth / 2 ),
			height / 2,
			z
		);
		building.castShadow = true;
		building.receiveShadow = true;
		scene.add( building );
		result.buildings.push( building );

		// Windows
		const winRows = Math.floor( height / 2.5 );
		const winCols = Math.floor( width / 1.2 );
		for ( let wr = 0; wr < winRows; wr ++ ) {

			for ( let wc = 0; wc < winCols; wc ++ ) {

				if ( Math.random() < 0.25 ) continue;
				const lit = Math.random() < 0.6;
				const winColor = lit
					? new THREE.Color().setHSL( 0.1 + Math.random() * 0.05, 0.3, 0.5 + Math.random() * 0.3 )
					: new THREE.Color( 0x111122 );
				const winMat = new THREE.MeshStandardMaterial( {
					color: winColor,
					emissive: lit ? winColor : new THREE.Color( 0 ),
					emissiveIntensity: lit ? 0.4 : 0,
					roughness: 0.3
				} );
				const win = new THREE.Mesh( new THREE.PlaneGeometry( 0.5, 0.8 ), winMat );
				win.position.set(
					building.position.x - side * ( width / 2 + 0.01 ),
					1.5 + wr * 2.5,
					z - width / 2 + 0.8 + wc * 1.2
				);
				win.rotation.y = side > 0 ? Math.PI / 2 : - Math.PI / 2;
				scene.add( win );

			}

		}

	}

	// ── Street lamps ──
	for ( let i = 0; i < 8; i ++ ) {

		const side = i % 2 === 0 ? - 1 : 1;
		const z = - streetLength / 2 + i * ( streetLength / 8 ) + 4;

		const pole = new THREE.Mesh(
			new THREE.CylinderGeometry( 0.05, 0.07, 6, 8 ),
			new THREE.MeshStandardMaterial( { color: 0x444444, metalness: 0.8, roughness: 0.3 } )
		);
		pole.position.set( side * 4.5, 3, z );
		scene.add( pole );

		const lampBulb = new THREE.Mesh(
			new THREE.SphereGeometry( 0.12, 8, 4 ),
			new THREE.MeshStandardMaterial( {
				color: 0xffeedd, emissive: 0xffeedd, emissiveIntensity: 3.0
			} )
		);
		lampBulb.position.set( side * 4.5, 6.2, z );
		scene.add( lampBulb );

		const lampLight = new THREE.PointLight( 0xffeedd, 3, 15, 2 );
		lampLight.position.copy( lampBulb.position );
		scene.add( lampLight );
		result.lights.push( lampLight );

	}

	// ── Vehicles ──
	const carColors = [ 0xff3333, 0x3333ff, 0xffcc00, 0x33ff33, 0xff6600, 0xcc33ff ];
	for ( let i = 0; i < vehicleCount; i ++ ) {

		const carGroup = new THREE.Group();
		const carColor = carColors[ i % carColors.length ];
		const carBody = new THREE.Mesh(
			new THREE.BoxGeometry( 1.8, 0.6, 4 ),
			new THREE.MeshStandardMaterial( { color: carColor, roughness: 0.3, metalness: 0.6 } )
		);
		carBody.position.y = 0.5;
		carGroup.add( carBody );

		const carTop = new THREE.Mesh(
			new THREE.BoxGeometry( 1.4, 0.5, 2 ),
			new THREE.MeshStandardMaterial( { color: carColor, roughness: 0.3, metalness: 0.6 } )
		);
		carTop.position.y = 1.05;
		carGroup.add( carTop );

		// Windshield
		const glass = new THREE.Mesh(
			new THREE.PlaneGeometry( 1.3, 0.45 ),
			new THREE.MeshStandardMaterial( { color: 0x334455, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 } )
		);
		glass.position.set( 0, 1.0, 1.05 );
		glass.rotation.x = - 0.3;
		carGroup.add( glass );

		const side = i % 2 === 0 ? - 1 : 1;
		carGroup.position.set(
			side * ( 2.5 + Math.random() ),
			0,
			- streetLength / 2 + ( i / vehicleCount ) * streetLength * 0.8 + 5
		);
		if ( side > 0 ) carGroup.rotation.y = Math.PI;
		carGroup.traverse( ( c ) => { if ( c.isMesh ) c.castShadow = true; } );
		scene.add( carGroup );
		result.vehicles.push( carGroup );

	}

	// ── Lighting ──
	scene.add( new THREE.AmbientLight( 0x334455, 0.4 ) );
	const sunLight = new THREE.DirectionalLight( 0xfff0dd, 1.5 );
	sunLight.position.set( 20, 30, 10 );
	sunLight.castShadow = true;
	sunLight.shadow.mapSize.setScalar( 2048 );
	sunLight.shadow.camera.left = - 30;
	sunLight.shadow.camera.right = 30;
	sunLight.shadow.camera.top = 30;
	sunLight.shadow.camera.bottom = - 30;
	sunLight.shadow.camera.far = 60;
	scene.add( sunLight );

	// ── Async Kenney City + Car models ──
	const cityPath = MODELS + 'kenney-city/';
	const carPath = MODELS + 'kenney-cars/';

	const kenneyCityGroup = new THREE.Group();
	kenneyCityGroup.name = 'kenneyCity';
	scene.add( kenneyCityGroup );
	result.kenneyModels = kenneyCityGroup;

	// Load road segments
	const roadSegmentFile = 'road-straight.glb';
	const crossroadFile = 'road-crossroad.glb';
	const streetLightFiles = [ 'light-curved.glb', 'light-square.glb' ];
	const constructionFiles = [ 'construction-cone.glb', 'construction-barrier.glb' ];
	const signFiles = [ 'sign-highway.glb' ];

	const cityEntries = [
		{ file: roadSegmentFile, type: 'road' },
		{ file: crossroadFile, type: 'crossroad' },
		...streetLightFiles.map( ( f ) => ( { file: f, type: 'streetlight' } ) ),
		...constructionFiles.map( ( f ) => ( { file: f, type: 'construction' } ) ),
		...signFiles.map( ( f ) => ( { file: f, type: 'sign' } ) )
	];

	// Load vehicles
	const vehicleFiles = [ 'sedan.glb', 'taxi.glb', 'police.glb', 'suv.glb', 'truck.glb' ];
	const carEntries = vehicleFiles.map( ( f ) => ( { file: f, type: 'vehicle' } ) );

	const allCityPromises = [
		...cityEntries.map( ( e ) =>
			loadModel( cityPath + e.file ).then( ( m ) => ( { model: m, type: e.type } ) )
		),
		...carEntries.map( ( e ) =>
			loadModel( carPath + e.file ).then( ( m ) => ( { model: m, type: e.type } ) )
		)
	];

	Promise.all( allCityPromises ).then( ( loaded ) => {

		const valid = loaded.filter( ( e ) => e.model !== null );
		if ( valid.length === 0 ) return;

		const roadTemplate = valid.find( ( e ) => e.type === 'road' );
		const crossroadTemplate = valid.find( ( e ) => e.type === 'crossroad' );
		const lightTemplates = valid.filter( ( e ) => e.type === 'streetlight' ).map( ( e ) => e.model );
		const constructionTemplates = valid.filter( ( e ) => e.type === 'construction' ).map( ( e ) => e.model );
		const signTemplates = valid.filter( ( e ) => e.type === 'sign' ).map( ( e ) => e.model );
		const vehicleTemplates = valid.filter( ( e ) => e.type === 'vehicle' ).map( ( e ) => e.model );

		// Lay road segments along the street
		if ( roadTemplate ) {

			const segCount = Math.floor( streetLength / 4 );
			for ( let i = 0; i < segCount; i ++ ) {

				const clone = roadTemplate.model.clone();
				clone.scale.set( 2.5, 2.5, 2.5 );
				clone.position.set( 0, 0.02, - streetLength / 2 + i * 4 + 2 );
				kenneyCityGroup.add( clone );

			}

		}

		// Place a crossroad in the middle
		if ( crossroadTemplate ) {

			const cross = crossroadTemplate.model.clone();
			cross.scale.set( 2.5, 2.5, 2.5 );
			cross.position.set( 0, 0.02, 0 );
			kenneyCityGroup.add( cross );

		}

		// Street lights along the road
		if ( lightTemplates.length > 0 ) {

			for ( let i = 0; i < 8; i ++ ) {

				const side = i % 2 === 0 ? - 1 : 1;
				const z = - streetLength / 2 + i * ( streetLength / 8 ) + 4;
				const template = lightTemplates[ i % lightTemplates.length ];
				const clone = template.clone();
				clone.scale.set( 2.5, 2.5, 2.5 );
				clone.position.set( side * 5.5, 0, z );
				clone.rotation.y = side > 0 ? Math.PI : 0;
				kenneyCityGroup.add( clone );

			}

		}

		// Vehicles along curbs
		if ( vehicleTemplates.length > 0 ) {

			for ( let i = 0; i < vehicleCount; i ++ ) {

				const template = vehicleTemplates[ i % vehicleTemplates.length ];
				const clone = template.clone();
				clone.scale.set( 1.0, 1.0, 1.0 );
				const side = i % 2 === 0 ? - 1 : 1;
				clone.position.set(
					side * ( 3.5 + Math.random() * 0.5 ),
					0,
					- streetLength / 2 + ( i / vehicleCount ) * streetLength * 0.8 + 5
				);
				if ( side > 0 ) clone.rotation.y = Math.PI;
				clone.traverse( ( c ) => {

					if ( c.isMesh ) { c.castShadow = true; c.receiveShadow = true; }

				} );
				kenneyCityGroup.add( clone );

			}

		}

		// Construction details scattered near sidewalks
		if ( constructionTemplates.length > 0 ) {

			for ( let i = 0; i < 6; i ++ ) {

				const template = constructionTemplates[ i % constructionTemplates.length ];
				const clone = template.clone();
				clone.scale.set( 2.0, 2.0, 2.0 );
				const side = i % 2 === 0 ? - 1 : 1;
				clone.position.set(
					side * ( 5.0 + Math.random() ),
					0,
					- streetLength / 3 + i * 8
				);
				kenneyCityGroup.add( clone );

			}

		}

		// Highway sign
		if ( signTemplates.length > 0 ) {

			const sign = signTemplates[ 0 ].clone();
			sign.scale.set( 2.5, 2.5, 2.5 );
			sign.position.set( 6.5, 0, - streetLength / 4 );
			kenneyCityGroup.add( sign );

		}

	} );

	return result;

}

// ════════════════════════════════════════════════════════════════
// 4. SHOWROOM — orbit, transform, reflector, env-mapping, etc.
// ════════════════════════════════════════════════════════════════

export function buildShowroom( scene, renderer, opts = {} ) {

	const {
		platformRadius = 3,
		accentColor1 = 0x4a9eff,
		accentColor2 = 0xa855f7,
		floorSize = 30,
		hdr = EQUIRECT + 'lobe.hdr'
	} = opts;

	const result = { platform: null, floor: null, lights: [] };

	loadHDREnvironment( renderer, scene, hdr );
	scene.fog = new THREE.FogExp2( 0x0a0e1a, 0.015 );

	// ── Floor ──
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry( floorSize, floorSize ),
		new THREE.MeshStandardMaterial( {
			color: 0x080b14, roughness: 0.08, metalness: 0.92
		} )
	);
	floor.rotation.x = - Math.PI / 2;
	floor.receiveShadow = true;
	scene.add( floor );
	result.floor = floor;

	// ── Platform ──
	const platGeo = new THREE.CylinderGeometry( platformRadius, platformRadius + 0.2, 0.15, 64 );
	const platMat = new THREE.MeshStandardMaterial( {
		color: 0x1a1e2e, roughness: 0.3, metalness: 0.7
	} );
	const platform = new THREE.Mesh( platGeo, platMat );
	platform.position.y = 0.075;
	platform.receiveShadow = true;
	scene.add( platform );
	result.platform = platform;

	// Platform rim glow
	const rimGeo = new THREE.TorusGeometry( platformRadius + 0.1, 0.03, 8, 64 );
	const rimMat = new THREE.MeshStandardMaterial( {
		color: accentColor1, emissive: accentColor1, emissiveIntensity: 2.0,
		roughness: 0.1
	} );
	const rim = new THREE.Mesh( rimGeo, rimMat );
	rim.rotation.x = - Math.PI / 2;
	rim.position.y = 0.16;
	scene.add( rim );

	// ── 3-point lighting ──
	const keyLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
	keyLight.position.set( 5, 10, 5 );
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.setScalar( 2048 );
	keyLight.shadow.camera.left = - 5;
	keyLight.shadow.camera.right = 5;
	keyLight.shadow.camera.top = 5;
	keyLight.shadow.camera.bottom = - 5;
	keyLight.shadow.bias = - 0.001;
	scene.add( keyLight );
	result.lights.push( keyLight );

	const fillLight = new THREE.DirectionalLight( accentColor1, 0.8 );
	fillLight.position.set( - 5, 4, - 3 );
	scene.add( fillLight );
	result.lights.push( fillLight );

	const rimLight = new THREE.DirectionalLight( accentColor2, 1.2 );
	rimLight.position.set( - 2, 6, - 8 );
	scene.add( rimLight );
	result.lights.push( rimLight );

	scene.add( new THREE.AmbientLight( 0x222244, 0.3 ) );

	return result;

}

// ════════════════════════════════════════════════════════════════
// 5. FOREST SCENE — god-rays, instancing, LOD, particles
// ════════════════════════════════════════════════════════════════

export function buildForestScene( scene, renderer, opts = {} ) {

	const {
		treeCount = 500,
		spread = 40,
		sunAngle = 0.3,
		fogDensity = 0.025
	} = opts;

	const result = { trees: null, ground: null, sun: null };

	loadHDREnvironment( renderer, scene, EQUIRECT + 'spruit_sunrise_1k.hdr', { background: true } );
	scene.fog = new THREE.FogExp2( 0x1a3a1a, fogDensity );

	// ── Ground ──
	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry( spread * 2.5, spread * 2.5, 32, 32 ),
		new THREE.MeshStandardMaterial( {
			color: 0x1a3a1a, roughness: 0.9, metalness: 0.0
		} )
	);
	ground.rotation.x = - Math.PI / 2;
	ground.receiveShadow = true;

	// Gentle terrain displacement
	const posAttr = ground.geometry.attributes.position;
	for ( let i = 0; i < posAttr.count; i ++ ) {

		const x = posAttr.getX( i );
		const y = posAttr.getY( i );
		posAttr.setZ( i, ( Math.sin( x * 0.1 ) * Math.cos( y * 0.1 ) ) * 1.5 );

	}

	ground.geometry.computeVertexNormals();
	scene.add( ground );
	result.ground = ground;

	// ── Instanced trees ──
	// Trunk
	const trunkGeo = new THREE.CylinderGeometry( 0.1, 0.15, 2, 6 );
	const trunkMat = new THREE.MeshStandardMaterial( { color: 0x4a3520, roughness: 0.9 } );
	const trunkMesh = new THREE.InstancedMesh( trunkGeo, trunkMat, treeCount );
	trunkMesh.castShadow = true;
	trunkMesh.receiveShadow = true;

	// Canopy
	const canopyGeo = new THREE.ConeGeometry( 1.2, 3, 6 );
	const canopyMat = new THREE.MeshStandardMaterial( { color: 0x1a5a2a, roughness: 0.8 } );
	const canopyMesh = new THREE.InstancedMesh( canopyGeo, canopyMat, treeCount );
	canopyMesh.castShadow = true;
	canopyMesh.receiveShadow = true;

	const dummy = new THREE.Object3D();
	const canopyColor = new THREE.Color();

	for ( let i = 0; i < treeCount; i ++ ) {

		const x = ( Math.random() - 0.5 ) * spread * 2;
		const z = ( Math.random() - 0.5 ) * spread * 2;
		const scale = 0.6 + Math.random() * 1.0;

		// Trunk
		dummy.position.set( x, scale, z );
		dummy.scale.set( scale, scale, scale );
		dummy.rotation.y = Math.random() * Math.PI * 2;
		dummy.updateMatrix();
		trunkMesh.setMatrixAt( i, dummy.matrix );

		// Canopy
		dummy.position.set( x, scale * 2 + 1.5, z );
		dummy.updateMatrix();
		canopyMesh.setMatrixAt( i, dummy.matrix );

		// Color variation
		canopyColor.setHSL( 0.25 + Math.random() * 0.1, 0.4 + Math.random() * 0.3, 0.15 + Math.random() * 0.15 );
		canopyMesh.setColorAt( i, canopyColor );

	}

	trunkMesh.instanceMatrix.needsUpdate = true;
	canopyMesh.instanceMatrix.needsUpdate = true;
	canopyMesh.instanceColor.needsUpdate = true;

	scene.add( trunkMesh );
	scene.add( canopyMesh );
	result.trees = { trunks: trunkMesh, canopies: canopyMesh };

	// ── Sun ──
	const sunGeo = new THREE.SphereGeometry( 2, 16, 8 );
	const sunMat = new THREE.MeshBasicMaterial( {
		color: 0xffee88
	} );
	const sun = new THREE.Mesh( sunGeo, sunMat );
	const sunDir = new THREE.Vector3( Math.cos( sunAngle ), Math.sin( sunAngle ) * 0.5 + 0.3, - 0.5 ).normalize();
	sun.position.copy( sunDir.multiplyScalar( 60 ) );
	scene.add( sun );
	result.sun = sun;

	// ── Lighting ──
	scene.add( new THREE.AmbientLight( 0x224422, 0.5 ) );

	const sunLight = new THREE.DirectionalLight( 0xfff0cc, 2.5 );
	sunLight.position.copy( sun.position );
	sunLight.castShadow = true;
	sunLight.shadow.mapSize.setScalar( 2048 );
	sunLight.shadow.camera.left = - 20;
	sunLight.shadow.camera.right = 20;
	sunLight.shadow.camera.top = 20;
	sunLight.shadow.camera.bottom = - 20;
	sunLight.shadow.camera.far = 80;
	scene.add( sunLight );

	// ── Dust motes ──
	const dustCount = 300;
	const dustGeo = new THREE.BufferGeometry();
	const dustPositions = new Float32Array( dustCount * 3 );
	for ( let i = 0; i < dustCount; i ++ ) {

		dustPositions[ i * 3 ] = ( Math.random() - 0.5 ) * spread;
		dustPositions[ i * 3 + 1 ] = Math.random() * 8;
		dustPositions[ i * 3 + 2 ] = ( Math.random() - 0.5 ) * spread;

	}

	dustGeo.setAttribute( 'position', new THREE.BufferAttribute( dustPositions, 3 ) );
	const dustMat = new THREE.PointsMaterial( {
		color: 0xddcc88, size: 0.05, transparent: true, opacity: 0.5, sizeAttenuation: true
	} );
	scene.add( new THREE.Points( dustGeo, dustMat ) );

	// ── Async Kenney Nature models ──
	const naturePath = MODELS + 'kenney-nature/';
	const treeModelFiles = [
		'tree_default.glb', 'tree_oak.glb', 'tree_pineDefaultA.glb',
		'tree_detailed.glb', 'tree_fat.glb'
	];
	const rockModelFiles = [ 'rock_largeA.glb', 'rock_largeB.glb', 'rock_smallA.glb' ];
	const plantModelFiles = [ 'plant_bush.glb', 'flower_redA.glb', 'grass.glb' ];

	const allNatureEntries = [
		...treeModelFiles.map( ( f ) => ( { file: f, type: 'tree' } ) ),
		...rockModelFiles.map( ( f ) => ( { file: f, type: 'rock' } ) ),
		...plantModelFiles.map( ( f ) => ( { file: f, type: 'plant' } ) )
	];

	const kenneyNatureGroup = new THREE.Group();
	kenneyNatureGroup.name = 'kenneyNature';
	scene.add( kenneyNatureGroup );
	result.kenneyModels = kenneyNatureGroup;

	Promise.all(
		allNatureEntries.map( ( entry ) =>
			loadModel( naturePath + entry.file ).then( ( m ) => ( { model: m, type: entry.type } ) )
		)
	).then( ( loaded ) => {

		const valid = loaded.filter( ( e ) => e.model !== null );
		if ( valid.length === 0 ) return;

		const treeTemplates = valid.filter( ( e ) => e.type === 'tree' ).map( ( e ) => e.model );
		const rockTemplates = valid.filter( ( e ) => e.type === 'rock' ).map( ( e ) => e.model );
		const plantTemplates = valid.filter( ( e ) => e.type === 'plant' ).map( ( e ) => e.model );

		if ( treeTemplates.length > 0 ) {

			const kenneyTreeCount = Math.min( 60, Math.floor( treeCount * 0.12 ) );
			for ( let i = 0; i < kenneyTreeCount; i ++ ) {

				const template = treeTemplates[ i % treeTemplates.length ];
				const clone = template.clone();
				const s = 2.0 + Math.random() * 2.0;
				clone.scale.setScalar( s );
				clone.position.set(
					( Math.random() - 0.5 ) * spread * 2,
					0,
					( Math.random() - 0.5 ) * spread * 2
				);
				clone.rotation.y = Math.random() * Math.PI * 2;
				clone.traverse( ( c ) => {

					if ( c.isMesh ) { c.castShadow = true; c.receiveShadow = true; }

				} );
				kenneyNatureGroup.add( clone );

			}

		}

		if ( rockTemplates.length > 0 ) {

			for ( let i = 0; i < 20; i ++ ) {

				const template = rockTemplates[ i % rockTemplates.length ];
				const clone = template.clone();
				const s = 1.5 + Math.random() * 2.5;
				clone.scale.setScalar( s );
				clone.position.set(
					( Math.random() - 0.5 ) * spread * 2,
					0,
					( Math.random() - 0.5 ) * spread * 2
				);
				clone.rotation.y = Math.random() * Math.PI * 2;
				clone.traverse( ( c ) => {

					if ( c.isMesh ) { c.castShadow = true; c.receiveShadow = true; }

				} );
				kenneyNatureGroup.add( clone );

			}

		}

		if ( plantTemplates.length > 0 ) {

			for ( let i = 0; i < 30; i ++ ) {

				const template = plantTemplates[ i % plantTemplates.length ];
				const clone = template.clone();
				const s = 1.5 + Math.random() * 1.5;
				clone.scale.setScalar( s );
				clone.position.set(
					( Math.random() - 0.5 ) * spread * 1.8,
					0,
					( Math.random() - 0.5 ) * spread * 1.8
				);
				clone.rotation.y = Math.random() * Math.PI * 2;
				kenneyNatureGroup.add( clone );

			}

		}

	} );

	return result;

}

// ════════════════════════════════════════════════════════════════
// 6. INTERIOR ROOM — SSAO, tone-mapping, render-targets, audio
// ════════════════════════════════════════════════════════════════

export function buildInteriorRoom( scene, renderer, opts = {} ) {

	const {
		roomWidth = 8,
		roomDepth = 10,
		roomHeight = 3.5,
		furniture = true,
		useSponza = false
	} = opts;

	const result = { walls: [], furniture: [], lights: [] };

	loadHDREnvironment( renderer, scene, EQUIRECT + 'venice_sunset_1k.hdr' );

	// ── Optional Sponza atrium ──
	if ( useSponza ) {

		const sponzaGroup = new THREE.Group();
		sponzaGroup.name = 'sponza';
		scene.add( sponzaGroup );
		result.sponza = sponzaGroup;

		loadModel( MODELS + 'sponza/Sponza.gltf' ).then( ( sponzaScene ) => {

			if ( ! sponzaScene ) return;
			const clone = sponzaScene.clone();
			clone.scale.setScalar( 0.015 );
			clone.position.set( 0, 0, 0 );
			clone.traverse( ( c ) => {

				if ( c.isMesh ) { c.castShadow = true; c.receiveShadow = true; }

			} );
			sponzaGroup.add( clone );

		} );

	}

	const woodDiffuse = loadTexture( TEXTURES + 'hardwood2_diffuse.jpg', {
		wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: [ 4, 6 ]
	} );
	const woodBump = loadTexture( TEXTURES + 'hardwood2_bump.jpg', {
		wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
		repeat: [ 4, 6 ], colorSpace: THREE.NoColorSpace
	} );

	// ── Floor ──
	const floorMat = new THREE.MeshStandardMaterial( {
		map: woodDiffuse, bumpMap: woodBump, bumpScale: 0.15,
		roughness: 0.5, metalness: 0.1
	} );
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry( roomWidth, roomDepth ),
		floorMat
	);
	floor.rotation.x = - Math.PI / 2;
	floor.receiveShadow = true;
	scene.add( floor );

	// ── Walls ──
	const wallMat = new THREE.MeshStandardMaterial( { color: 0xd4cfc4, roughness: 0.85, metalness: 0.0 } );

	// Back wall
	const backWall = new THREE.Mesh(
		new THREE.PlaneGeometry( roomWidth, roomHeight ),
		wallMat
	);
	backWall.position.set( 0, roomHeight / 2, - roomDepth / 2 );
	backWall.receiveShadow = true;
	scene.add( backWall );
	result.walls.push( backWall );

	// Side walls
	for ( let side = - 1; side <= 1; side += 2 ) {

		const sideWall = new THREE.Mesh(
			new THREE.PlaneGeometry( roomDepth, roomHeight ),
			wallMat
		);
		sideWall.position.set( side * roomWidth / 2, roomHeight / 2, 0 );
		sideWall.rotation.y = - side * Math.PI / 2;
		sideWall.receiveShadow = true;
		scene.add( sideWall );
		result.walls.push( sideWall );

	}

	// Ceiling
	const ceiling = new THREE.Mesh(
		new THREE.PlaneGeometry( roomWidth, roomDepth ),
		new THREE.MeshStandardMaterial( { color: 0xeeeeee, roughness: 0.9 } )
	);
	ceiling.rotation.x = Math.PI / 2;
	ceiling.position.y = roomHeight;
	scene.add( ceiling );

	// ── Window ──
	const winMat = new THREE.MeshStandardMaterial( {
		color: 0x88bbdd, emissive: 0x88bbdd, emissiveIntensity: 1.5
	} );
	const window_ = new THREE.Mesh( new THREE.PlaneGeometry( 2, 1.5 ), winMat );
	window_.position.set( 0, 2, - roomDepth / 2 + 0.01 );
	scene.add( window_ );

	// Window frame
	const frameMat = new THREE.MeshStandardMaterial( { color: 0xeeeeee, roughness: 0.3 } );
	const frameTop = new THREE.Mesh( new THREE.BoxGeometry( 2.2, 0.08, 0.08 ), frameMat );
	frameTop.position.set( 0, 2.78, - roomDepth / 2 + 0.04 );
	scene.add( frameTop );
	const frameBot = new THREE.Mesh( new THREE.BoxGeometry( 2.2, 0.08, 0.08 ), frameMat );
	frameBot.position.set( 0, 1.22, - roomDepth / 2 + 0.04 );
	scene.add( frameBot );

	// ── Furniture ──
	if ( furniture ) {

		const furnMat = new THREE.MeshStandardMaterial( { color: 0x3a3a4a, roughness: 0.6 } );
		const cushionMat = new THREE.MeshStandardMaterial( { color: 0x556688, roughness: 0.8 } );

		// Sofa
		const sofaBase = new THREE.Mesh( new THREE.BoxGeometry( 2.5, 0.4, 0.8 ), furnMat );
		sofaBase.position.set( - 1.5, 0.2, - roomDepth / 2 + 1.2 );
		sofaBase.castShadow = true;
		sofaBase.receiveShadow = true;
		scene.add( sofaBase );
		result.furniture.push( sofaBase );

		const sofaBack = new THREE.Mesh( new THREE.BoxGeometry( 2.5, 0.6, 0.15 ), furnMat );
		sofaBack.position.set( - 1.5, 0.7, - roomDepth / 2 + 0.85 );
		scene.add( sofaBack );

		// Cushions
		for ( let i = 0; i < 3; i ++ ) {

			const cushion = new THREE.Mesh( new THREE.BoxGeometry( 0.7, 0.1, 0.6 ), cushionMat );
			cushion.position.set( - 2.3 + i * 0.8, 0.45, - roomDepth / 2 + 1.2 );
			scene.add( cushion );

		}

		// Coffee table
		const tableMat = new THREE.MeshStandardMaterial( { color: 0x5a4a3a, roughness: 0.4, metalness: 0.2 } );
		const coffeeTable = new THREE.Mesh( new THREE.BoxGeometry( 1.2, 0.08, 0.6 ), tableMat );
		coffeeTable.position.set( - 1.5, 0.4, - roomDepth / 2 + 2.5 );
		coffeeTable.receiveShadow = true;
		scene.add( coffeeTable );
		result.furniture.push( coffeeTable );

		// Table legs
		const tableLegGeo = new THREE.CylinderGeometry( 0.03, 0.03, 0.4, 6 );
		const tableLegMat = new THREE.MeshStandardMaterial( { color: 0x333333, metalness: 0.8, roughness: 0.3 } );
		[ [ - 0.5, - 0.2 ], [ 0.5, - 0.2 ], [ - 0.5, 0.2 ], [ 0.5, 0.2 ] ].forEach( ( [ lx, lz ] ) => {

			const leg = new THREE.Mesh( tableLegGeo, tableLegMat );
			leg.position.set( - 1.5 + lx, 0.2, - roomDepth / 2 + 2.5 + lz );
			scene.add( leg );

		} );

		// Bookshelf
		const shelfMat = new THREE.MeshStandardMaterial( { color: 0x3a2a1a, roughness: 0.7 } );
		const shelf = new THREE.Mesh( new THREE.BoxGeometry( 1.5, 2.5, 0.35 ), shelfMat );
		shelf.position.set( roomWidth / 2 - 0.5, 1.25, - roomDepth / 2 + 0.3 );
		shelf.castShadow = true;
		scene.add( shelf );
		result.furniture.push( shelf );

		// Books
		for ( let row = 0; row < 4; row ++ ) {

			for ( let b = 0; b < 5; b ++ ) {

				const bookH = 0.2 + Math.random() * 0.1;
				const book = new THREE.Mesh(
					new THREE.BoxGeometry( 0.06 + Math.random() * 0.04, bookH, 0.18 ),
					new THREE.MeshStandardMaterial( {
						color: new THREE.Color().setHSL( Math.random(), 0.4, 0.25 + Math.random() * 0.15 ),
						roughness: 0.8
					} )
				);
				book.position.set(
					roomWidth / 2 - 1.1 + b * 0.2,
					0.3 + row * 0.55 + bookH / 2,
					- roomDepth / 2 + 0.3
				);
				scene.add( book );

			}

		}

	}

	// ── Lighting ──
	scene.add( new THREE.AmbientLight( 0x404050, 0.4 ) );

	// Ceiling light
	const ceilLight = new THREE.PointLight( 0xfff5e0, 3, 12, 2 );
	ceilLight.position.set( 0, roomHeight - 0.3, 0 );
	ceilLight.castShadow = true;
	ceilLight.shadow.mapSize.setScalar( 1024 );
	scene.add( ceilLight );
	result.lights.push( ceilLight );

	// Window light
	const winLight = new THREE.DirectionalLight( 0x88bbdd, 1.5 );
	winLight.position.set( 0, 3, - 6 );
	winLight.castShadow = true;
	winLight.shadow.mapSize.setScalar( 2048 );
	winLight.shadow.camera.left = - 4;
	winLight.shadow.camera.right = 4;
	winLight.shadow.camera.top = 4;
	winLight.shadow.camera.bottom = - 1;
	scene.add( winLight );
	result.lights.push( winLight );

	return result;

}

// ════════════════════════════════════════════════════════════════
// 7. SPACE SCENE — fly controls, stereo, particles
// ════════════════════════════════════════════════════════════════

export function buildSpaceScene( scene, renderer, opts = {} ) {

	const {
		starCount = 3000,
		asteroidCount = 50,
		nebula = true
	} = opts;

	const result = { planet: null, asteroids: null, stars: null };

	// Skybox
	const cubeLoader = new THREE.CubeTextureLoader();
	cubeLoader.setPath( '../../examples/textures/cube/MilkyWay/' );
	const skybox = cubeLoader.load( [
		'dark-s_px.jpg', 'dark-s_nx.jpg',
		'dark-s_py.jpg', 'dark-s_ny.jpg',
		'dark-s_pz.jpg', 'dark-s_nz.jpg'
	] );
	scene.background = skybox;

	// ── Stars ──
	const starGeo = new THREE.BufferGeometry();
	const starPositions = new Float32Array( starCount * 3 );
	const starColors = new Float32Array( starCount * 3 );
	for ( let i = 0; i < starCount; i ++ ) {

		const r = 80 + Math.random() * 120;
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos( Math.random() * 2 - 1 );
		starPositions[ i * 3 ] = r * Math.sin( phi ) * Math.cos( theta );
		starPositions[ i * 3 + 1 ] = r * Math.sin( phi ) * Math.sin( theta );
		starPositions[ i * 3 + 2 ] = r * Math.cos( phi );

		const color = new THREE.Color().setHSL( Math.random() * 0.2 + 0.55, 0.3, 0.7 + Math.random() * 0.3 );
		starColors[ i * 3 ] = color.r;
		starColors[ i * 3 + 1 ] = color.g;
		starColors[ i * 3 + 2 ] = color.b;

	}

	starGeo.setAttribute( 'position', new THREE.BufferAttribute( starPositions, 3 ) );
	starGeo.setAttribute( 'color', new THREE.BufferAttribute( starColors, 3 ) );
	const stars = new THREE.Points( starGeo, new THREE.PointsMaterial( {
		size: 0.3, vertexColors: true, sizeAttenuation: true
	} ) );
	scene.add( stars );
	result.stars = stars;

	// ── Planet ──
	const planetGeo = new THREE.SphereGeometry( 8, 64, 32 );
	const planetMat = new THREE.MeshStandardMaterial( {
		color: 0x2244aa, roughness: 0.7, metalness: 0.1
	} );
	const planet = new THREE.Mesh( planetGeo, planetMat );
	planet.position.set( 30, - 10, - 40 );
	scene.add( planet );
	result.planet = planet;

	// Atmosphere glow
	const atmosGeo = new THREE.SphereGeometry( 8.5, 64, 32 );
	const atmosMat = new THREE.MeshBasicMaterial( {
		color: 0x4488ff, transparent: true, opacity: 0.15, side: THREE.BackSide
	} );
	const atmos = new THREE.Mesh( atmosGeo, atmosMat );
	atmos.position.copy( planet.position );
	scene.add( atmos );

	// ── Asteroids ──
	const asteroidGeo = new THREE.DodecahedronGeometry( 1, 0 );
	const asteroidMat = new THREE.MeshStandardMaterial( { color: 0x665544, roughness: 0.9 } );
	const asteroidMesh = new THREE.InstancedMesh( asteroidGeo, asteroidMat, asteroidCount );

	const dummy = new THREE.Object3D();
	for ( let i = 0; i < asteroidCount; i ++ ) {

		dummy.position.set(
			( Math.random() - 0.5 ) * 80,
			( Math.random() - 0.5 ) * 40,
			( Math.random() - 0.5 ) * 80
		);
		const s = 0.3 + Math.random() * 1.5;
		dummy.scale.set( s, s * ( 0.5 + Math.random() * 0.5 ), s );
		dummy.rotation.set( Math.random() * Math.PI, Math.random() * Math.PI, 0 );
		dummy.updateMatrix();
		asteroidMesh.setMatrixAt( i, dummy.matrix );

	}

	asteroidMesh.instanceMatrix.needsUpdate = true;
	scene.add( asteroidMesh );
	result.asteroids = asteroidMesh;

	// ── Nebula ──
	if ( nebula ) {

		const nebulaColors = [ 0xff4488, 0x4488ff, 0x88ff44, 0xff8844 ];
		for ( let i = 0; i < 12; i ++ ) {

			const canvas = document.createElement( 'canvas' );
			canvas.width = 64;
			canvas.height = 64;
			const ctx = canvas.getContext( '2d' );
			const grad = ctx.createRadialGradient( 32, 32, 0, 32, 32, 32 );
			const c = new THREE.Color( nebulaColors[ i % nebulaColors.length ] );
			grad.addColorStop( 0, `rgba(${Math.floor( c.r * 255 )},${Math.floor( c.g * 255 )},${Math.floor( c.b * 255 )},0.3)` );
			grad.addColorStop( 1, 'rgba(0,0,0,0)' );
			ctx.fillStyle = grad;
			ctx.fillRect( 0, 0, 64, 64 );

			const spriteMat = new THREE.SpriteMaterial( {
				map: new THREE.CanvasTexture( canvas ),
				transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
			} );
			const sprite = new THREE.Sprite( spriteMat );
			sprite.position.set(
				( Math.random() - 0.5 ) * 100,
				( Math.random() - 0.5 ) * 50,
				- 30 - Math.random() * 60
			);
			sprite.scale.setScalar( 15 + Math.random() * 25 );
			scene.add( sprite );

		}

	}

	// ── Lighting ──
	scene.add( new THREE.AmbientLight( 0x111133, 0.5 ) );
	const spaceSunLight = new THREE.DirectionalLight( 0xffffff, 1.5 );
	spaceSunLight.position.set( 30, 20, 20 );
	scene.add( spaceSunLight );

	// ── Async Kenney Space models ──
	const spacePath = MODELS + 'kenney-space/';

	const craftFiles = [ 'craft_cargoA.glb', 'craft_racer.glb', 'craft_speederA.glb', 'craft_speederB.glb', 'craft_miner.glb' ];
	const structureFiles = [ 'hangar_largeA.glb', 'platform_large.glb', 'satelliteDish.glb' ];
	const detailFiles = [ 'turret_single.glb', 'barrel.glb', 'pipe_straight.glb' ];

	const allSpaceEntries = [
		...craftFiles.map( ( f ) => ( { file: f, type: 'craft' } ) ),
		...structureFiles.map( ( f ) => ( { file: f, type: 'structure' } ) ),
		...detailFiles.map( ( f ) => ( { file: f, type: 'detail' } ) )
	];

	const kenneySpaceGroup = new THREE.Group();
	kenneySpaceGroup.name = 'kenneySpace';
	scene.add( kenneySpaceGroup );
	result.kenneyModels = kenneySpaceGroup;

	Promise.all(
		allSpaceEntries.map( ( entry ) =>
			loadModel( spacePath + entry.file ).then( ( m ) => ( { model: m, type: entry.type } ) )
		)
	).then( ( loaded ) => {

		const valid = loaded.filter( ( e ) => e.model !== null );
		if ( valid.length === 0 ) return;

		const craftTemplates = valid.filter( ( e ) => e.type === 'craft' ).map( ( e ) => e.model );
		const structureTemplates = valid.filter( ( e ) => e.type === 'structure' ).map( ( e ) => e.model );
		const detailTemplates = valid.filter( ( e ) => e.type === 'detail' ).map( ( e ) => e.model );

		// Scatter spacecraft around the scene
		if ( craftTemplates.length > 0 ) {

			for ( let i = 0; i < 12; i ++ ) {

				const template = craftTemplates[ i % craftTemplates.length ];
				const clone = template.clone();
				const s = 1.5 + Math.random() * 2.0;
				clone.scale.setScalar( s );
				clone.position.set(
					( Math.random() - 0.5 ) * 70,
					( Math.random() - 0.5 ) * 30,
					( Math.random() - 0.5 ) * 70
				);
				clone.rotation.set(
					( Math.random() - 0.5 ) * 0.5,
					Math.random() * Math.PI * 2,
					( Math.random() - 0.5 ) * 0.3
				);
				clone.traverse( ( c ) => {

					if ( c.isMesh ) { c.castShadow = true; }

				} );
				kenneySpaceGroup.add( clone );

			}

		}

		// Place structures (hangars, platforms) in a loose cluster
		if ( structureTemplates.length > 0 ) {

			for ( let i = 0; i < structureTemplates.length; i ++ ) {

				const clone = structureTemplates[ i ].clone();
				clone.scale.setScalar( 3.0 );
				clone.position.set(
					- 15 + i * 15,
					- 5 + Math.random() * 3,
					- 20 + Math.random() * 10
				);
				clone.rotation.y = Math.random() * Math.PI * 2;
				kenneySpaceGroup.add( clone );

			}

		}

		// Scatter small detail objects
		if ( detailTemplates.length > 0 ) {

			for ( let i = 0; i < 15; i ++ ) {

				const template = detailTemplates[ i % detailTemplates.length ];
				const clone = template.clone();
				clone.scale.setScalar( 1.0 + Math.random() * 1.5 );
				clone.position.set(
					( Math.random() - 0.5 ) * 50,
					( Math.random() - 0.5 ) * 20,
					( Math.random() - 0.5 ) * 50
				);
				clone.rotation.set(
					Math.random() * Math.PI,
					Math.random() * Math.PI,
					Math.random() * Math.PI
				);
				kenneySpaceGroup.add( clone );

			}

		}

	} );

	return result;

}

// ════════════════════════════════════════════════════════════════
// 8. MUSEUM — first-person, pointer-lock, raycaster
// ════════════════════════════════════════════════════════════════

export function buildMuseum( scene, renderer, opts = {} ) {

	const {
		hallLength = 20,
		hallWidth = 6,
		hallHeight = 4,
		pedestalCount = 6
	} = opts;

	const result = { pedestals: [], displayObjects: [], walls: [] };

	loadHDREnvironment( renderer, scene, EQUIRECT + 'venice_sunset_1k.hdr' );

	// ── Floor ──
	const floorMat = new THREE.MeshStandardMaterial( {
		color: 0x2a2a2a, roughness: 0.3, metalness: 0.5
	} );
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry( hallWidth, hallLength ),
		floorMat
	);
	floor.rotation.x = - Math.PI / 2;
	floor.receiveShadow = true;
	scene.add( floor );

	// ── Walls ──
	const wallMat = new THREE.MeshStandardMaterial( { color: 0x3a3a4a, roughness: 0.7 } );

	for ( let side = - 1; side <= 1; side += 2 ) {

		const wall = new THREE.Mesh(
			new THREE.PlaneGeometry( hallLength, hallHeight ),
			wallMat
		);
		wall.position.set( side * hallWidth / 2, hallHeight / 2, 0 );
		wall.rotation.y = - side * Math.PI / 2;
		wall.receiveShadow = true;
		scene.add( wall );
		result.walls.push( wall );

	}

	// End walls
	const endWall = new THREE.Mesh(
		new THREE.PlaneGeometry( hallWidth, hallHeight ),
		wallMat
	);
	endWall.position.set( 0, hallHeight / 2, - hallLength / 2 );
	scene.add( endWall );
	result.walls.push( endWall );

	const endWall2 = new THREE.Mesh(
		new THREE.PlaneGeometry( hallWidth, hallHeight ),
		wallMat
	);
	endWall2.position.set( 0, hallHeight / 2, hallLength / 2 );
	endWall2.rotation.y = Math.PI;
	scene.add( endWall2 );

	// Ceiling
	const ceiling = new THREE.Mesh(
		new THREE.PlaneGeometry( hallWidth, hallLength ),
		new THREE.MeshStandardMaterial( { color: 0x444444, roughness: 0.9 } )
	);
	ceiling.rotation.x = Math.PI / 2;
	ceiling.position.y = hallHeight;
	scene.add( ceiling );

	// ── Pedestals with display objects ──
	const displayColors = [ 0x4a9eff, 0xff6b6b, 0x22c55e, 0xa855f7, 0xfbbf24, 0xf97316 ];
	const displayGeos = [
		new THREE.TorusKnotGeometry( 0.3, 0.1, 64, 16 ),
		new THREE.IcosahedronGeometry( 0.35, 1 ),
		new THREE.OctahedronGeometry( 0.35, 0 ),
		new THREE.DodecahedronGeometry( 0.3, 0 ),
		new THREE.TorusGeometry( 0.25, 0.12, 16, 32 ),
		new THREE.TetrahedronGeometry( 0.35, 0 )
	];

	for ( let i = 0; i < pedestalCount; i ++ ) {

		const side = i % 2 === 0 ? - 1 : 1;
		const z = - hallLength / 2 + ( i + 0.5 ) / pedestalCount * hallLength;

		// Pedestal
		const pedestal = new THREE.Mesh(
			new THREE.CylinderGeometry( 0.4, 0.45, 1.0, 16 ),
			new THREE.MeshStandardMaterial( { color: 0x222233, roughness: 0.3, metalness: 0.7 } )
		);
		pedestal.position.set( side * ( hallWidth / 2 - 1 ), 0.5, z );
		pedestal.receiveShadow = true;
		scene.add( pedestal );
		result.pedestals.push( pedestal );

		// Display object
		const color = displayColors[ i % displayColors.length ];
		const obj = new THREE.Mesh(
			displayGeos[ i % displayGeos.length ],
			new THREE.MeshStandardMaterial( {
				color, roughness: 0.2, metalness: 0.6,
				emissive: color, emissiveIntensity: 0.1
			} )
		);
		obj.position.set( side * ( hallWidth / 2 - 1 ), 1.3, z );
		obj.castShadow = true;
		scene.add( obj );
		result.displayObjects.push( obj );

		// Spot light
		const spot = new THREE.SpotLight( color, 3, 5, Math.PI / 6, 0.5 );
		spot.position.set( side * ( hallWidth / 2 - 1 ), hallHeight - 0.3, z );
		spot.target = obj;
		spot.castShadow = true;
		spot.shadow.mapSize.setScalar( 512 );
		scene.add( spot );
		scene.add( spot.target );

	}

	// ── Ambient ──
	scene.add( new THREE.AmbientLight( 0x222233, 0.3 ) );

	// Ceiling track lights
	for ( let i = 0; i < 4; i ++ ) {

		const z = - hallLength / 2 + ( i + 0.5 ) * ( hallLength / 4 );
		const trackLight = new THREE.PointLight( 0xfff0dd, 1.5, 8, 2 );
		trackLight.position.set( 0, hallHeight - 0.2, z );
		scene.add( trackLight );

	}

	return result;

}
