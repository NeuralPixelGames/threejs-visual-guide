/**
 * GUI Parameter Tooltip Enhancement
 *
 * Auto-detects lil-gui panels and adds hover tooltips with descriptions
 * for common Three.js parameters. Loaded by demo-nav.js in both v1 and v2.
 */
( function () {

	if ( window.__guiEnhanceLoaded ) return;
	window.__guiEnhanceLoaded = true;

	/* ── Inject tooltip CSS ─────────────────────────────── */

	const css = document.createElement( 'style' );
	css.textContent = `
		.gui-tip-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 14px;
			height: 14px;
			border-radius: 50%;
			background: rgba(74, 158, 255, 0.12);
			border: 1px solid rgba(74, 158, 255, 0.25);
			color: #4a9eff;
			font-size: 9px;
			font-weight: 700;
			font-style: normal;
			font-family: 'Inter', system-ui, sans-serif;
			cursor: help;
			flex-shrink: 0;
			margin-left: 4px;
			transition: all 0.15s;
			line-height: 1;
			opacity: 0.6;
		}
		.gui-tip-icon:hover {
			opacity: 1;
			background: rgba(74, 158, 255, 0.22);
			border-color: #4a9eff;
			box-shadow: 0 0 8px rgba(74, 158, 255, 0.3);
		}
		.gui-tip-popup {
			position: fixed;
			z-index: 10000;
			max-width: 260px;
			padding: 8px 12px;
			background: rgba(8, 12, 22, 0.96);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border: 1px solid rgba(74, 158, 255, 0.3);
			border-radius: 8px;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(74, 158, 255, 0.08);
			pointer-events: none;
			opacity: 0;
			transform: translateY(4px);
			transition: opacity 0.15s, transform 0.15s;
			font-family: 'Inter', system-ui, sans-serif;
		}
		.gui-tip-popup.visible {
			opacity: 1;
			transform: translateY(0);
		}
		.gui-tip-popup .tip-label {
			font-size: 10px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: #4a9eff;
			margin-bottom: 3px;
		}
		.gui-tip-popup .tip-desc {
			font-size: 11.5px;
			line-height: 1.45;
			color: #c8d0e4;
		}
		.gui-tip-popup .tip-range {
			margin-top: 4px;
			font-size: 10px;
			color: #6b7394;
			display: flex;
			justify-content: space-between;
			gap: 6px;
		}
		.gui-tip-popup .tip-range span {
			color: #8b95b0;
		}
		.lil-gui .children > .controller .name {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
		}
		.gui-inline-desc {
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			width: 100%;
			font-size: 10px;
			line-height: 1.25;
			color: #8899bb;
			font-family: 'Inter', system-ui, sans-serif;
			font-weight: 400;
			white-space: normal;
			overflow: hidden;
			margin-top: -1px;
			pointer-events: none;
			order: 10;
		}
	`;
	document.head.appendChild( css );

	/* ── Parameter Description Database ─────────────────── */

	const TIPS = {

		/* Camera & View */
		'Auto Rotate':        { desc: 'Automatically orbit the camera around the scene center.' },
		'autoRotate':         { desc: 'Automatically orbit the camera around the scene center.' },
		'Rotate Speed':       { desc: 'Camera orbit speed. Higher = faster rotation.', lo: 'Slow', hi: 'Fast' },
		'rotateSpeed':        { desc: 'Camera orbit speed.', lo: 'Slow', hi: 'Fast' },
		'Rotation Speed':     { desc: 'How fast objects spin.', lo: 'Slow', hi: 'Fast' },
		'FOV':                { desc: 'Field of view in degrees. Wider = more visible but more edge distortion.', lo: 'Telephoto', hi: 'Fisheye' },
		'fov':                { desc: 'Field of view in degrees.', lo: 'Telephoto', hi: 'Fisheye' },
		'Cam Distance':       { desc: 'Camera distance from the subject.', lo: 'Close-up', hi: 'Far away' },
		'Cam Height':         { desc: 'Vertical camera position.', lo: 'Ground level', hi: 'Bird\'s-eye' },
		'Cam Speed':          { desc: 'Camera movement speed.', lo: 'Slow', hi: 'Fast' },
		'Zoom':               { desc: 'Camera zoom level.', lo: 'Wide', hi: 'Tight' },
		'Ortho Zoom':         { desc: 'Orthographic camera zoom. Changes visible area without perspective.', lo: 'Wide', hi: 'Tight' },
		'Eye Separation':     { desc: 'Distance between stereo camera eyes. Affects 3D depth intensity.', lo: 'Subtle 3D', hi: 'Extreme 3D' },
		'Persp FOV':          { desc: 'Perspective camera field of view.', lo: 'Telephoto', hi: 'Wide-angle' },
		'Frustum':            { desc: 'The visible region of 3D space that the camera can see, shaped like a truncated pyramid.' },
		'Show Frustum':       { desc: 'Display the camera frustum wireframe.' },
		'Near':               { desc: 'Nearest distance the camera can see. Objects closer are clipped.' },
		'near':               { desc: 'Near clipping plane distance.' },
		'Far':                { desc: 'Farthest distance the camera can see. Objects beyond are clipped.' },
		'far':                { desc: 'Far clipping plane distance.' },
		'Aspect':             { desc: 'Width-to-height ratio of the camera viewport.' },
		'aspect':             { desc: 'Camera viewport aspect ratio.' },
		'Forward/Back Motion': { desc: 'Toggle forward-and-back camera animation through the scene.' },
		'forwardBack':        { desc: 'Toggle forward/back camera animation.' },
		'Left':               { desc: 'Left boundary of the orthographic camera view.' },
		'Right':              { desc: 'Right boundary of the orthographic camera view.' },
		'Top':                { desc: 'Top boundary of the orthographic camera view.' },
		'Bottom':             { desc: 'Bottom boundary of the orthographic camera view.' },
		'Visible':            { desc: 'Toggle object visibility in the scene.' },
		'visible':            { desc: 'Toggle visibility.' },
		'Cast Shadow':        { desc: 'Whether this object casts shadows onto other surfaces.' },
		'castShadow':         { desc: 'Enable shadow casting.' },
		'Receive Shadow':     { desc: 'Whether this object receives shadows from other objects.' },
		'receiveShadow':      { desc: 'Enable shadow receiving.' },
		'Flat Shading':       { desc: 'Use flat normals per face instead of smooth interpolation.' },
		'flatShading':        { desc: 'Toggle flat shading.' },
		'Side':               { desc: 'Which face sides to render: front, back, or both.' },
		'Segments':           { desc: 'Number of subdivisions in the geometry. More = smoother.', lo: 'Low-poly', hi: 'Smooth' },
		'segments':           { desc: 'Geometry subdivisions.', lo: 'Low-poly', hi: 'Smooth' },
		'Radius':             { desc: 'Size of the object radius.', lo: 'Small', hi: 'Large' },
		'radius':             { desc: 'Object radius.', lo: 'Small', hi: 'Large' },
		'Scale':              { desc: 'Uniform scale multiplier for the object.', lo: 'Tiny', hi: 'Huge' },
		'scale':              { desc: 'Object scale.', lo: 'Tiny', hi: 'Huge' },
		'Position X':         { desc: 'Object position along the left-right axis.' },
		'Position Y':         { desc: 'Object position along the up-down axis.' },
		'Position Z':         { desc: 'Object position along the front-back axis.' },

		/* Material Properties */
		'Wireframe':          { desc: 'Show polygon mesh edges instead of filled surfaces.' },
		'wireframe':          { desc: 'Show polygon mesh edges instead of filled surfaces.' },
		'Roughness':          { desc: 'Surface micro-detail. Low = mirror-like reflections, high = diffused matte.', lo: 'Mirror', hi: 'Matte' },
		'roughness':          { desc: 'Surface micro-detail.', lo: 'Mirror', hi: 'Matte' },
		'Metalness':          { desc: 'How metallic the surface looks. Metals reflect environment; non-metals reflect diffusely.', lo: 'Plastic/wood', hi: 'Chrome/gold' },
		'metalness':          { desc: 'How metallic the surface looks.', lo: 'Plastic', hi: 'Metal' },
		'Opacity':            { desc: 'Surface transparency.', lo: 'Invisible', hi: 'Solid' },
		'opacity':            { desc: 'Surface transparency.', lo: 'Invisible', hi: 'Solid' },
		'Mesh Opacity':       { desc: 'Transparency of the mesh surface.', lo: 'Invisible', hi: 'Solid' },
		'Emissive':           { desc: 'Self-illumination intensity. Makes the surface glow without external light.', lo: 'No glow', hi: 'Bright glow' },
		'Emissive Intensity': { desc: 'How strongly the material glows on its own.', lo: 'No glow', hi: 'Bright glow' },
		'Env Intensity':      { desc: 'Strength of environment map reflections on surfaces.', lo: 'No reflection', hi: 'Full reflection' },
		'envIntensity':       { desc: 'Strength of environment map reflections.', lo: 'No reflection', hi: 'Full reflection' },
		'Env Map Intensity':  { desc: 'How much the environment map contributes to reflections.', lo: 'None', hi: 'Full' },
		'envMapIntensity':    { desc: 'Environment map reflection strength.', lo: 'None', hi: 'Full' },
		'Normal Strength':    { desc: 'Intensity of normal-map bump effect. Adds detail without extra geometry.', lo: 'Flat', hi: 'Deep grooves' },
		'Color':              { desc: 'Base surface color of the material.' },
		'color':              { desc: 'Base surface color of the material.' },

		/* Lighting */
		'Intensity':          { desc: 'Light brightness.', lo: 'Dim', hi: 'Bright' },
		'intensity':          { desc: 'Light brightness.', lo: 'Dim', hi: 'Bright' },
		'Light Scale':        { desc: 'Overall light intensity multiplier.', lo: 'Dark', hi: 'Bright' },
		'Room Brightness':    { desc: 'Ambient brightness of the room.', lo: 'Dark', hi: 'Bright' },
		'Light X':            { desc: 'Light position along the left\u2013right axis.' },
		'Light Y':            { desc: 'Light position along the up\u2013down axis.' },
		'Light Z':            { desc: 'Light position along the front\u2013back axis.' },
		'Shadow Bias':        { desc: 'Offset to fix shadow acne. Too much causes peter-panning (shadow detaches).', lo: 'Less offset', hi: 'More offset' },
		'Shadow Map Size':    { desc: 'Shadow texture resolution. Higher = sharper but more GPU cost.', lo: 'Soft/fast', hi: 'Sharp/slow' },
		'Cone Inner Angle':   { desc: 'Inner cone where audio is at full volume (degrees).', lo: 'Narrow', hi: 'Wide' },
		'Cone Outer Angle':   { desc: 'Outer cone beyond which audio drops to outer gain (degrees).', lo: 'Narrow', hi: 'Wide' },
		'Cone Outer Gain':    { desc: 'Volume level outside the outer cone.', lo: 'Silent', hi: 'Full volume' },

		/* Post-Processing */
		'Exposure':           { desc: 'Overall scene brightness, like adjusting a camera\u2019s exposure time.', lo: 'Dark', hi: 'Bright' },
		'exposure':           { desc: 'Overall scene brightness.', lo: 'Dark', hi: 'Bright' },
		'Tone Mapping Exposure': { desc: 'Exposure for tone-mapped rendering.', lo: 'Dark', hi: 'Bright' },
		'Bloom':              { desc: 'Glow effect on bright areas. Simulates light bleeding into surrounding pixels.', lo: 'No glow', hi: 'Strong glow' },
		'Bloom Strength':     { desc: 'Intensity of the bloom glow on bright surfaces.', lo: 'No glow', hi: 'Strong glow' },
		'bloomStrength':      { desc: 'Bloom glow intensity.', lo: 'No glow', hi: 'Strong glow' },
		'Bloom Threshold':    { desc: 'Brightness cutoff for bloom. Only pixels brighter than this glow.', lo: 'Everything glows', hi: 'Only brightest glow' },
		'bloomThreshold':     { desc: 'Brightness cutoff for bloom.', lo: 'Everything glows', hi: 'Only brightest' },
		'Bloom Radius':       { desc: 'How far bloom glow spreads from bright pixels.', lo: 'Tight glow', hi: 'Wide glow' },
		'bloomRadius':        { desc: 'How far bloom spreads.', lo: 'Tight', hi: 'Wide' },
		'Kernel Radius':      { desc: 'Sample radius for the effect. Larger = smoother but heavier on GPU.', lo: 'Precise', hi: 'Smooth' },
		'SSAO Radius':        { desc: 'How far ambient-occlusion samples reach. Affects crevice shadow size.', lo: 'Tight shadows', hi: 'Wide shadows' },
		'Focus Distance':     { desc: 'Distance from camera where objects are sharpest.', lo: 'Close focus', hi: 'Far focus' },
		'Aperture':           { desc: 'Simulated lens aperture. Wider = shallower depth of field (more blur).', lo: 'Deep focus', hi: 'Shallow focus' },
		'Focal Length':       { desc: 'Simulated lens focal length. Affects depth-of-field falloff.', lo: 'Wide lens', hi: 'Telephoto' },
		'Brightness':         { desc: 'Image brightness adjustment.', lo: 'Darker', hi: 'Brighter' },
		'brightness':         { desc: 'Image brightness.', lo: 'Darker', hi: 'Brighter' },
		'Contrast':           { desc: 'Difference between light and dark areas.', lo: 'Flat/gray', hi: 'Punchy' },
		'contrast':           { desc: 'Light vs. dark difference.', lo: 'Flat', hi: 'Punchy' },
		'Saturation':         { desc: 'Color vividness.', lo: 'Grayscale', hi: 'Vivid colors' },
		'saturation':         { desc: 'Color vividness.', lo: 'Gray', hi: 'Vivid' },
		'Grayscale':          { desc: 'Convert the image to black and white.' },
		'Scanline Speed':     { desc: 'Speed of CRT-style scanline animation.', lo: 'Slow scan', hi: 'Fast scan' },
		'TV Brightness':      { desc: 'CRT monitor brightness simulation.', lo: 'Dark', hi: 'Bright' },
		'Grid Effect':        { desc: 'Toggle CRT pixel-grid overlay.' },
		'Constant Glitch':    { desc: 'Enable continuous glitch distortion instead of triggered bursts.' },
		'Trigger Glitch':     { desc: 'Fire a single glitch burst.' },
		'Color Shift R':      { desc: 'Red channel offset for chromatic aberration.', lo: 'No shift', hi: 'Strong shift' },
		'Color Shift G':      { desc: 'Green channel offset for chromatic aberration.', lo: 'No shift', hi: 'Strong shift' },
		'Color Shift B':      { desc: 'Blue channel offset for chromatic aberration.', lo: 'No shift', hi: 'Strong shift' },
		'God Ray Intensity':  { desc: 'Strength of volumetric light shafts.', lo: 'Subtle', hi: 'Dramatic' },
		'Dissolve Speed':     { desc: 'How fast the dissolve/disintegration effect progresses.', lo: 'Slow', hi: 'Fast' },

		/* Sky & Environment */
		'Turbidity':          { desc: 'Atmospheric haze from dust/moisture. Affects how washed-out the sky looks.', lo: 'Crystal clear', hi: 'Dusty/hazy' },
		'turbidity':          { desc: 'Atmospheric haze level.', lo: 'Clear', hi: 'Hazy' },
		'Rayleigh':           { desc: 'Rayleigh scattering \u2014 makes the sky blue and sunsets orange.', lo: 'Pale sky', hi: 'Deep blue' },
		'rayleigh':           { desc: 'Rayleigh scattering intensity.', lo: 'Pale', hi: 'Deep blue' },
		'Mie Coeff':          { desc: 'Mie scattering amount \u2014 creates the halo/glow around the sun.', lo: 'No halo', hi: 'Large halo' },
		'mieCoefficient':     { desc: 'Mie scattering (sun halo).', lo: 'No halo', hi: 'Large halo' },
		'Mie Dir G':          { desc: 'Directional concentration of Mie scattering. Higher = tighter sun glow.', lo: 'Diffuse glow', hi: 'Focused beam' },
		'mieDirectionalG':    { desc: 'Sun glow focus.', lo: 'Diffuse', hi: 'Focused' },
		'Sun Elevation':      { desc: 'Sun angle above the horizon in degrees.', lo: 'Sunset/rise', hi: 'High noon' },
		'elevation':          { desc: 'Sun angle above horizon.', lo: 'Sunset', hi: 'Noon' },
		'Fog':                { desc: 'Toggle distance-based atmospheric fog.' },
		'fog':                { desc: 'Toggle distance fog.' },
		'Fog Density':        { desc: 'How quickly fog thickens with distance.', lo: 'Thin haze', hi: 'Thick pea-soup' },
		'fogDensity':         { desc: 'Fog thickness.', lo: 'Thin', hi: 'Thick' },
		'Background Blur':    { desc: 'Blur amount on the environment background.', lo: 'Sharp', hi: 'Blurred' },
		'Bg Blur':            { desc: 'Background environment blur.', lo: 'Sharp', hi: 'Blurred' },
		'Background Intensity': { desc: 'Brightness of the environment background.', lo: 'Dark', hi: 'Bright' },
		'HDR Map':            { desc: 'Choose which HDR environment map to use for lighting and reflections.' },

		/* Water */
		'Water Color':        { desc: 'Base tint of the water surface.' },
		'waterColor':         { desc: 'Base water color.' },
		'Sun Color':          { desc: 'Color of sunlight reflections on the water.' },
		'sunColor':           { desc: 'Sunlight reflection color on water.' },
		'Distortion Scale':   { desc: 'Intensity of water surface wave distortion.', lo: 'Calm/flat', hi: 'Choppy waves' },
		'distortionScale':    { desc: 'Water wave distortion.', lo: 'Calm', hi: 'Choppy' },
		'Mirror Floor':       { desc: 'Toggle reflective floor/mirror plane.' },
		'Mirror Tint':        { desc: 'Color tint of the mirror reflection.' },

		/* Physics */
		'Gravity':            { desc: 'Downward force on physics objects.', lo: 'Floaty/moon', hi: 'Heavy/Jupiter' },
		'gravity':            { desc: 'Downward force strength.', lo: 'Moon', hi: 'Jupiter' },
		'Restitution':        { desc: 'Bounciness of collisions. 0 = dead stop, 1 = perfect bounce.', lo: 'No bounce', hi: 'Super bouncy' },
		'restitution':        { desc: 'Collision bounciness.', lo: 'Dead stop', hi: 'Super bouncy' },
		'Ball Speed':         { desc: 'Wrecking ball swing velocity.', lo: 'Gentle', hi: 'Destructive' },
		'wreckingBallSpeed':  { desc: 'Wrecking ball speed.', lo: 'Slow', hi: 'Fast' },
		'Spawn Crate':        { desc: 'Drop a new physics crate into the scene.' },
		'Spawn Burst (5)':    { desc: 'Drop 5 crates at once.' },
		'Impulse':            { desc: 'Force applied on impact.', lo: 'Gentle tap', hi: 'Explosive' },
		'impulseStrength':    { desc: 'Impact force.', lo: 'Gentle', hi: 'Explosive' },
		'Wind Strength':      { desc: 'Force of wind on cloth/particles.', lo: 'Calm', hi: 'Gale' },
		'windStrength':       { desc: 'Wind force.', lo: 'Calm', hi: 'Gale' },
		'Wind Direction':     { desc: 'Angle the wind blows from (degrees).' },
		'Damping':            { desc: 'Energy loss over time. Higher = objects settle faster.', lo: 'Frictionless', hi: 'Sluggish' },
		'damping':            { desc: 'Energy loss rate.', lo: 'Free', hi: 'Sluggish' },
		'Stiffness':          { desc: 'Rigidity of joints/springs. Higher = less flex.', lo: 'Floppy', hi: 'Rigid' },
		'Joint Stiffness':    { desc: 'How rigid the physics joints are.', lo: 'Floppy', hi: 'Rigid' },
		'Reset Car':          { desc: 'Reset vehicle to starting position.' },
		'Reset Cloth':        { desc: 'Reset cloth simulation to rest state.' },
		'Steering':           { desc: 'Steering sensitivity.', lo: 'Sluggish', hi: 'Twitchy' },
		'Acceleration':       { desc: 'Vehicle acceleration force.', lo: 'Slow', hi: 'Rocket' },
		'acceleration':       { desc: 'Acceleration force.', lo: 'Slow', hi: 'Fast' },
		'Max Speed':          { desc: 'Vehicle top speed.', lo: 'Slow', hi: 'Fast' },
		'maxSpeed':           { desc: 'Top speed.', lo: 'Slow', hi: 'Fast' },

		/* Animation */
		'Speed':              { desc: 'Animation playback speed.', lo: 'Slow-mo', hi: 'Fast-forward' },
		'speed':              { desc: 'Animation speed.', lo: 'Slow', hi: 'Fast' },
		'Animation Speed':    { desc: 'Playback speed multiplier for animations.', lo: 'Slow-mo', hi: 'Fast-forward' },
		'animationSpeed':     { desc: 'Animation speed multiplier.', lo: 'Slow-mo', hi: 'Fast' },
		'Anim Speed':         { desc: 'Animation playback speed.', lo: 'Slow-mo', hi: 'Fast-forward' },
		'Playback Speed':     { desc: 'How fast the animation plays.', lo: 'Slow-mo', hi: 'Fast-forward' },
		'playbackSpeed':      { desc: 'Animation playback rate.', lo: 'Slow', hi: 'Fast' },
		'Time Scale':         { desc: 'Global time multiplier. Affects all animations simultaneously.', lo: 'Slow-mo', hi: 'Fast-forward' },
		'timeScale':          { desc: 'Global time multiplier.', lo: 'Slow', hi: 'Fast' },
		'Crossfade':          { desc: 'Blend weight between two animations.', lo: 'Animation A', hi: 'Animation B' },
		'crossfade':          { desc: 'Blend between animations.', lo: 'Anim A', hi: 'Anim B' },
		'Crossfade Duration': { desc: 'How long the transition takes between animations (seconds).', lo: 'Instant snap', hi: 'Slow blend' },
		'Playing':            { desc: 'Play or pause the animation.' },
		'playing':            { desc: 'Play/pause animation.' },
		'Animate':            { desc: 'Toggle animation playback.' },
		'animate':            { desc: 'Toggle animation.' },
		'Loop Mode':          { desc: 'How the animation repeats: once, loop, or ping-pong.' },
		'Squash & Stretch':   { desc: 'Cartoon-style deformation during motion.' },

		/* Audio */
		'Volume':             { desc: 'Audio output level.', lo: 'Silent', hi: 'Loud' },
		'volume':             { desc: 'Audio volume.', lo: 'Silent', hi: 'Loud' },
		'Ref Distance':       { desc: 'Distance at which audio is at full volume. Beyond this, falloff begins.', lo: 'Close', hi: 'Far' },
		'refDistance':         { desc: 'Full-volume radius.', lo: 'Close', hi: 'Far' },
		'Max Distance':       { desc: 'Maximum distance at which audio is still audible.', lo: 'Short range', hi: 'Long range' },
		'maxDistance':         { desc: 'Audio hearing range.', lo: 'Short', hi: 'Long' },
		'Rolloff Factor':     { desc: 'How quickly volume drops with distance. Higher = faster falloff.', lo: 'Gradual', hi: 'Sharp cutoff' },
		'rolloffFactor':      { desc: 'Volume falloff rate.', lo: 'Gradual', hi: 'Sharp' },
		'Distance Model':     { desc: 'Algorithm for calculating volume over distance: linear, inverse, or exponential.' },
		'FFT Size':           { desc: 'Frequency analysis resolution. Higher = more detail but more CPU.', lo: 'Low detail', hi: 'High detail' },
		'Smoothing':          { desc: 'Temporal smoothing of audio analysis. Higher = less jittery visualisation.', lo: 'Responsive', hi: 'Smooth' },

		/* Geometry & Objects */
		'Instance Count':     { desc: 'Number of instanced copies. GPU renders all in one draw call.', lo: 'Few', hi: 'Many (heavier)' },
		'instanceCount':      { desc: 'Number of GPU instances.', lo: 'Few', hi: 'Many' },
		'Use Instancing':     { desc: 'Toggle GPU instancing \u2014 renders many copies with a single draw call.' },
		'Particle Size':      { desc: 'Size of each particle sprite.', lo: 'Tiny dots', hi: 'Large blobs' },
		'particleSize':       { desc: 'Particle sprite size.', lo: 'Small', hi: 'Large' },
		'Bevel Enabled':      { desc: 'Add rounded bevels to extruded geometry edges.' },
		'Bevel Size':         { desc: 'Width of the bevel on extruded edges.', lo: 'Subtle', hi: 'Pronounced' },
		'Bevel Thickness':    { desc: 'Depth of the bevel extrusion.', lo: 'Thin', hi: 'Thick' },
		'Bevel Segments':     { desc: 'Smoothness of the bevel curve. More segments = smoother.', lo: 'Faceted', hi: 'Smooth' },
		'Depth':              { desc: 'Extrusion depth of the shape.', lo: 'Flat', hi: 'Deep' },
		'depth':              { desc: 'Extrusion depth.', lo: 'Flat', hi: 'Deep' },
		'Height':             { desc: 'Vertical size of the object.', lo: 'Short', hi: 'Tall' },
		'Tension':            { desc: 'Spline curve tightness. Higher = tighter curves through control points.', lo: 'Loose/wavy', hi: 'Tight/sharp' },
		'tension':            { desc: 'Curve tightness.', lo: 'Loose', hi: 'Tight' },
		'Closed':             { desc: 'Connect the last curve point back to the first, forming a loop.' },
		'closed':             { desc: 'Close the curve into a loop.' },
		'Curve Type':         { desc: 'Mathematical method used to interpolate between control points.' },

		/* Helpers & Debug */
		'Show Helper':        { desc: 'Display debug visualisation helpers for the current object.' },
		'Show Helpers':       { desc: 'Toggle all debug visualisation helpers.' },
		'Show Labels':        { desc: 'Toggle text labels on scene objects.' },
		'Show Skeleton':      { desc: 'Display the bone skeleton wireframe over the mesh.' },
		'Show Wireframe':     { desc: 'Overlay wireframe on the mesh surface.' },
		'Show Normals':       { desc: 'Visualise surface normal vectors as coloured lines.' },
		'Show Points':        { desc: 'Display control/vertex points.' },
		'Show Curve':         { desc: 'Display the curve path line.' },
		'Show Mesh':          { desc: 'Toggle mesh surface visibility.' },
		'Show Ray':           { desc: 'Visualise the raycaster ray.' },
		'Show Hit Point':     { desc: 'Highlight where the ray intersects geometry.' },
		'Show Frustums':      { desc: 'Display camera frustum wireframes.' },
		'Show Planes':        { desc: 'Visualise clipping plane surfaces.' },
		'Show Background':    { desc: 'Toggle environment background visibility.' },
		'Show Tracks':        { desc: 'Display animation track curves.' },
		'Show Waveform':      { desc: 'Display audio waveform visualisation.' },
		'Show Ghosts':        { desc: 'Show ghosted previous positions for motion reference.' },
		'Show Animated':      { desc: 'Toggle the animated version on/off.' },
		'Show Copy':          { desc: 'Show the duplicated copy of the object.' },
		'Show Joints':        { desc: 'Display physics joint connections.' },
		'Show Connecting Lines': { desc: 'Draw lines connecting related objects.' },
		'Show Parallax Arrows':  { desc: 'Show arrows indicating parallax displacement direction.' },

		/* Controls */
		'Damping Factor':     { desc: 'Inertia/momentum when releasing orbit controls.', lo: 'Snappy stop', hi: 'Smooth glide' },
		'dampingFactor':      { desc: 'Orbit control inertia.', lo: 'Snappy', hi: 'Glidy' },
		'Movement Speed':     { desc: 'Camera movement speed for fly/first-person controls.', lo: 'Slow', hi: 'Fast' },
		'movementSpeed':      { desc: 'Camera move speed.', lo: 'Slow', hi: 'Fast' },
		'Roll Speed':         { desc: 'Camera roll rotation speed.', lo: 'Slow', hi: 'Fast' },
		'rollSpeed':          { desc: 'Camera roll speed.', lo: 'Slow', hi: 'Fast' },
		'Min Zoom':           { desc: 'Closest zoom level allowed.' },
		'Max Zoom':           { desc: 'Farthest zoom level allowed.' },
		'Min Distance':       { desc: 'Closest the camera can get to the target.' },

		/* TSL / Shaders */
		'Noise Scale':        { desc: 'Scale of procedural noise. Smaller = finer detail.', lo: 'Fine grain', hi: 'Large blobs' },
		'noiseScale':         { desc: 'Noise pattern scale.', lo: 'Fine', hi: 'Large' },
		'Frequency':          { desc: 'Noise or wave frequency. Higher = more repetitions.', lo: 'Low freq', hi: 'High freq' },
		'frequency':          { desc: 'Wave frequency.', lo: 'Low', hi: 'High' },
		'Pulse Speed':        { desc: 'Speed of pulsating animation.', lo: 'Slow pulse', hi: 'Fast pulse' },
		'Spin Speed':         { desc: 'Rotation speed of the effect.', lo: 'Slow', hi: 'Fast' },
		'Spread':             { desc: 'How spread out elements are from centre.', lo: 'Clustered', hi: 'Spread out' },
		'spread':             { desc: 'Element spread distance.', lo: 'Tight', hi: 'Wide' },
		'Displacement':       { desc: 'Vertex displacement from the surface.', lo: 'Flat', hi: 'Extreme deformation' },
		'Texture Size':       { desc: 'Resolution of the generated texture.', lo: 'Low-res', hi: 'High-res' },
		'Bar Scale':          { desc: 'Height multiplier for frequency bars.', lo: 'Short', hi: 'Tall' },

		/* Misc */
		'Preset':             { desc: 'Switch between pre-configured parameter sets.' },
		'preset':             { desc: 'Choose a parameter preset.' },
		'Mode':               { desc: 'Switch between different visualisation modes.' },
		'mode':               { desc: 'Visualisation mode.' },
		'Model':              { desc: 'Switch between different 3D models.' },
		'model':              { desc: 'Select 3D model.' },
		'Layout':             { desc: 'Switch between different panel/view layouts.' },
		'layout':             { desc: 'View layout arrangement.' },
		'Wild Mode':          { desc: 'Unlock extreme/exaggerated parameter ranges for fun.' },
		'Auto Orbit':         { desc: 'Automatically orbit the camera.' },
		'Rotate':             { desc: 'Toggle automatic rotation.' },
		'rotate':             { desc: 'Toggle rotation.' },
		'Rotate Y':           { desc: 'Rotation angle around the vertical axis.', lo: '0\u00b0', hi: '360\u00b0' },
		'Fold to Cube':       { desc: 'Fold the flat net into a 3D cube shape.' },
	};

	/* ── Tooltip Engine ─────────────────────────────────── */

	let popup = null;

	function ensurePopup() {

		if ( popup ) return popup;

		popup = document.createElement( 'div' );
		popup.className = 'gui-tip-popup';
		popup.innerHTML = '<div class="tip-label"></div><div class="tip-desc"></div><div class="tip-range"></div>';
		document.body.appendChild( popup );
		return popup;

	}

	function showTip( icon, tip, displayName ) {

		const el = ensurePopup();
		const rect = icon.getBoundingClientRect();

		el.querySelector( '.tip-label' ).textContent = displayName;
		el.querySelector( '.tip-desc' ).textContent = tip.desc;

		const rangeEl = el.querySelector( '.tip-range' );

		if ( tip.lo && tip.hi ) {

			rangeEl.innerHTML = '<span>\u2190 ' + tip.lo + '</span><span>' + tip.hi + ' \u2192</span>';
			rangeEl.style.display = '';

		} else {

			rangeEl.style.display = 'none';

		}

		el.classList.add( 'visible' );

		const popW = el.offsetWidth;
		const popH = el.offsetHeight;
		let left = rect.left - popW - 8;
		let top = rect.top + ( rect.height / 2 ) - ( popH / 2 );

		if ( left < 8 ) left = rect.right + 8;
		if ( top < 4 ) top = 4;
		if ( top + popH > window.innerHeight - 4 ) top = window.innerHeight - popH - 4;

		el.style.left = left + 'px';
		el.style.top = top + 'px';

	}

	function hideTip() {

		if ( popup ) popup.classList.remove( 'visible' );

	}

	function findTip( name ) {

		if ( ! name ) return null;
		if ( TIPS[ name ] ) return { tip: TIPS[ name ], label: name };

		const lower = name.toLowerCase();

		for ( const key in TIPS ) {

			if ( key.toLowerCase() === lower ) return { tip: TIPS[ key ], label: key };

		}

		return null;

	}

	function enhanceController( controller ) {

		if ( controller.dataset.tipDone ) return;
		controller.dataset.tipDone = '1';

		const nameEl = controller.querySelector( '.name' );
		if ( ! nameEl ) return;

		const displayName = nameEl.textContent.trim();
		const propName = controller.querySelector( 'input' )?.getAttribute( 'aria-label' ) || '';

		const match = findTip( displayName ) || findTip( propName );
		if ( ! match ) return;

		const icon = document.createElement( 'i' );
		icon.className = 'gui-tip-icon';
		icon.textContent = '?';

		icon.addEventListener( 'mouseenter', function () {

			showTip( icon, match.tip, displayName );

		} );

		icon.addEventListener( 'mouseleave', hideTip );
		nameEl.appendChild( icon );

		/* Inline description - short text below the param name */
		const shortDesc = match.tip.short || match.tip.desc;
		const inlineDesc = document.createElement( 'span' );
		inlineDesc.className = 'gui-inline-desc';
		inlineDesc.textContent = shortDesc;
		nameEl.appendChild( inlineDesc );

	}

	function enhanceAll() {

		document.querySelectorAll( '.lil-gui .controller' ).forEach( enhanceController );

	}

	/* Watch for GUI creation */
	const observer = new MutationObserver( function ( mutations ) {

		let found = false;

		for ( const m of mutations ) {

			for ( const node of m.addedNodes ) {

				if ( node.nodeType === 1 &&
					( node.classList?.contains( 'lil-gui' ) ||
					  node.classList?.contains( 'controller' ) ||
					  node.querySelector?.( '.lil-gui' ) ) ) {

					found = true;
					break;

				}

			}

			if ( found ) break;

		}

		if ( found ) requestAnimationFrame( enhanceAll );

	} );

	if ( document.body ) {

		observer.observe( document.body, { childList: true, subtree: true } );

	} else {

		document.addEventListener( 'DOMContentLoaded', function () {

			observer.observe( document.body, { childList: true, subtree: true } );

		} );

	}

	/* Fallback sweeps for late-initializing GUIs */
	setTimeout( enhanceAll, 600 );
	setTimeout( enhanceAll, 1500 );
	setTimeout( enhanceAll, 3000 );

} )();
