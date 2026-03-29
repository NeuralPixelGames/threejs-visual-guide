( function () {

	var INFOGRAPHIC_MAP = {
		'cameras/perspective.html': '../../images/encyclopedia/07a_perspective_camera.webp',
		'cameras/orthographic.html': '../../images/encyclopedia/07b_orthographic_camera.webp',
		'cameras/cube.html': '../../images/encyclopedia/07c_cube_camera.webp',
		'cameras/stereo.html': '../../images/encyclopedia/07e_stereo_camera.webp',
		'geometry/primitives.html': '../../images/encyclopedia/02_geometry.webp',
		'materials/all-materials.html': '../../images/encyclopedia/03_materials.webp',
		'lights/all-lights.html': '../../images/encyclopedia/04_lights.webp',
		'objects/scene-graph.html': '../../images/encyclopedia/05_objects.webp',
		'textures/basics-uv.html': '../../images/encyclopedia/08a_texture_basics.webp',
		'textures/normal-maps.html': '../../images/encyclopedia/08b_normal_maps.webp',
		'textures/pbr-set.html': '../../images/encyclopedia/08c_pbr_texture_set.webp',
		'textures/cubetexture-skybox.html': '../../images/encyclopedia/08d_cube_texture_skybox.webp',
		'textures/video.html': '../../images/encyclopedia/08e_video_texture.webp',
		'textures/data.html': '../../images/encyclopedia/08f_data_texture.webp',
		'textures/hdr.html': '../../images/encyclopedia/08g_hdr_environment.webp',
		'textures/compressed.html': '../../images/encyclopedia/08h_compressed_textures.webp',
		'renderer/shadow-types.html': '../../images/encyclopedia/09a_shadow_types.webp',
		'renderer/env-mapping.html': '../../images/encyclopedia/09b_environment_mapping.webp',
		'renderer/tone-mapping.html': '../../images/encyclopedia/09c_tone_mapping.webp'
	};

	function detectDemoKey() {

		var path = window.location.pathname;
		var keys = Object.keys( INFOGRAPHIC_MAP );

		for ( var i = 0; i < keys.length; i ++ ) {

			if ( path.endsWith( keys[ i ] ) || path.endsWith( keys[ i ].replace( '.html', '' ) ) ) {

				return keys[ i ];

			}

		}

		return null;

	}

	function resolveImagePath( relPath ) {

		var path = window.location.pathname;

		for ( var m = 0; m < [ '/demos-v3/', '/demos-v2/', '/demos/' ].length; m ++ ) {

			var marker = [ '/demos-v3/', '/demos-v2/', '/demos/' ][ m ];
			var idx = path.lastIndexOf( marker );

			if ( idx !== - 1 ) {

				return path.substring( 0, idx ) + '/images/encyclopedia/' + relPath.split( '/images/encyclopedia/' )[ 1 ];

			}

		}

		var parts = path.split( '/' );
		parts.splice( - 2 );
		return parts.join( '/' ) + '/' + relPath.replace( /^\.\.\/\.\.\//,'' );

	}

	var key = detectDemoKey();
	if ( ! key ) return;

	var imageSrc = resolveImagePath( INFOGRAPHIC_MAP[ key ] );

	var style = document.createElement( 'style' );
	style.textContent =
		'#infographic-thumb {' +
			'position: fixed;' +
			'bottom: 56px;' +
			'left: 12px;' +
			'width: 64px;' +
			'height: 36px;' +
			'z-index: 1100;' +
			'cursor: pointer;' +
			'border-radius: 6px;' +
			'border: 1px solid rgba(74, 158, 255, 0.35);' +
			'background: rgba(10, 14, 26, 0.8);' +
			'overflow: hidden;' +
			'transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);' +
			'box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);' +
			'animation: infogFadeIn 0.5s ease-out both 0.8s;' +
		'}' +
		'@keyframes infogFadeIn {' +
			'from { opacity: 0; transform: translateY(8px); }' +
			'to { opacity: 1; transform: translateY(0); }' +
		'}' +
		'#infographic-thumb:hover {' +
			'width: 200px;' +
			'height: 112px;' +
			'border-color: rgba(74, 158, 255, 0.6);' +
			'box-shadow: 0 4px 24px rgba(74, 158, 255, 0.25), 0 0 12px rgba(74, 158, 255, 0.15);' +
		'}' +
		'#infographic-thumb img {' +
			'width: 100%;' +
			'height: 100%;' +
			'object-fit: cover;' +
			'display: block;' +
		'}' +
		'#infographic-modal {' +
			'position: fixed;' +
			'inset: 0;' +
			'z-index: 10000;' +
			'display: flex;' +
			'align-items: center;' +
			'justify-content: center;' +
			'background: rgba(0, 0, 0, 0.88);' +
			'backdrop-filter: blur(8px);' +
			'-webkit-backdrop-filter: blur(8px);' +
			'cursor: pointer;' +
			'animation: infogModalIn 0.2s ease-out;' +
		'}' +
		'@keyframes infogModalIn {' +
			'from { opacity: 0; }' +
			'to { opacity: 1; }' +
		'}' +
		'#infographic-modal.closing {' +
			'animation: infogModalOut 0.2s ease-in forwards;' +
		'}' +
		'@keyframes infogModalOut {' +
			'from { opacity: 1; }' +
			'to { opacity: 0; }' +
		'}' +
		'#infographic-modal img {' +
			'max-width: 95vw;' +
			'max-height: 95vh;' +
			'object-fit: contain;' +
			'border-radius: 8px;' +
			'border: 1px solid rgba(74, 158, 255, 0.2);' +
			'box-shadow: 0 12px 60px rgba(0, 0, 0, 0.6);' +
			'animation: infogImgIn 0.3s ease-out;' +
		'}' +
		'@keyframes infogImgIn {' +
			'from { transform: scale(0.92); opacity: 0; }' +
			'to { transform: scale(1); opacity: 1; }' +
		'}' +
		'#infographic-modal .modal-close-hint {' +
			'position: absolute;' +
			'top: 16px;' +
			'right: 20px;' +
			'color: rgba(255, 255, 255, 0.5);' +
			'font-family: "Inter", system-ui, sans-serif;' +
			'font-size: 13px;' +
			'pointer-events: none;' +
		'}';
	document.head.appendChild( style );

	var thumb = document.createElement( 'div' );
	thumb.id = 'infographic-thumb';
	thumb.title = 'View infographic (click to enlarge)';
	thumb.innerHTML = '<img src="' + imageSrc + '" alt="Infographic">';
	document.body.appendChild( thumb );

	function openModal() {

		var modal = document.createElement( 'div' );
		modal.id = 'infographic-modal';
		modal.innerHTML =
			'<img src="' + imageSrc + '" alt="Infographic">' +
			'<span class="modal-close-hint">Click or Esc to close</span>';
		document.body.appendChild( modal );

		function closeModal() {

			modal.classList.add( 'closing' );
			setTimeout( function () {

				if ( modal.parentNode ) modal.parentNode.removeChild( modal );

			}, 200 );

			document.removeEventListener( 'keydown', onKey );

		}

		modal.addEventListener( 'click', closeModal );

		function onKey( e ) {

			if ( e.key === 'Escape' ) closeModal();

		}

		document.addEventListener( 'keydown', onKey );

	}

	thumb.addEventListener( 'click', function () {

		if ( ! document.getElementById( 'infographic-modal' ) ) openModal();

	} );

} )();
