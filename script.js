/* ==========================================================================
   ARROW DESIGNER - Interactive Engine & Crisp Vector Renderer
   ========================================================================== */

(function () {
    // Natural Material Color Palette (when stain is OFF)
    const naturalMaterialMap = {
        cedar: '#D97706',
        spruce: '#EAB308',
        pine: '#F59E0B',
        bamboo: '#CA8A04',
        douglas: '#92400E',
        carbon: '#0F172A'
    };

    // Physical Dimension Scale: 735 SVG px = 30.0 inches -> 1 inch = 24.5 px
    const INCH_TO_PX = 24.5;

    // ----------------------------------------------------------------------
    // State Management & Constants
    // ----------------------------------------------------------------------
    const defaultState = {
        // Fletchings
        featherShape: 'shield',       // shield, banana, parabolic, batman, traditional, legolas-style, flu-flu
        featherLength: 4.0,           // inches (2.5 - 5.5)
        featherHeight: 100,           // % (60 - 130)
        feather1Color: '#DC2626',
        feather2Color: '#2563EB',
        feather3Color: '#2563EB',
        showFrontServing: true,
        showBackServing: true,
        servingColor: '#1E293B',
        enableSpiralWrap: false,      // Spiral Thread Binding around feathers
        spiralWrapColor: '#FEF08A',   // Spiral thread color

        // Shaft & Wood / Materials (STAIN OFF BY DEFAULT)
        woodType: 'cedar',            // cedar, spruce, pine, bamboo, douglas, carbon
        shaftDiameter: 8.0,           // mm (4.0 - 10.0)
        enableShaftStain: false,      // Stain OFF by default!
        useSingleShaftColor: true,
        shaftBackColor: '#D97706',
        shaftFrontColor: '#D97706',
        enableCrownDip: false,        // Crown Dip OFF by default
        crownLength: 5.5,             // inches from nock
        crownDipColor: '#F8FAFC',

        // Hardware
        pointType: 'field',           // field, bullet, broadhead2, broadhead3, bodkin, blunt
        pointColor: '#94A3B8',
        nockType: 'plastic',          // plastic, selfnock, horn
        nockColor: '#B45309',

        // Dynamic Cresting Bands Array (Inches: width & offset in ")
        showCresting: false,
        crestingStartOffset: 0.30,    // inches offset from front serving wrap
        crestingBands: [
            { id: 'b1', color: '#F59E0B', width: 0.40, offset: 0.15 }
        ],

        // Specs & Physics
        arrowLength: 30.0,            // inches
        drawWeight: 45,               // lbs
        pointWeight: 100,             // grains

        // Viewport (PAPER BACKGROUND BY DEFAULT)
        stageBg: 'paper',
        zoom: 1.0,
        panX: 0,
        panY: 0
    };

    let state = JSON.parse(JSON.stringify(defaultState));

    // Pan & Drag System Variables
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    // History System for Undo/Redo
    let history = [];
    let historyIndex = -1;
    const MAX_HISTORY = 40;
    let isApplyingHistory = false;

    // Presets Database (All dimensions in Inches)
    const builtInPresets = {
        robin: {
            name: "🏹 Robin Hood",
            featherShape: "shield",
            feather1Color: "#DC2626", feather2Color: "#166534", feather3Color: "#166534",
            woodType: "cedar", enableShaftStain: true, shaftBackColor: "#B45309", shaftFrontColor: "#B45309",
            enableCrownDip: true, crownDipColor: "#FEF08A", crownLength: 5.0,
            pointType: "field", pointColor: "#94A3B8", nockType: "selfnock", nockColor: "#78350F",
            showCresting: false,
            servingColor: "#451A03"
        },
        legolas: {
            name: "🧝 Elven Arrow",
            featherShape: "legolas-style",
            feather1Color: "#F8FAFC", feather2Color: "#15803D", feather3Color: "#15803D",
            featherLength: 4.5,
            woodType: "spruce", enableShaftStain: false,
            enableCrownDip: true, crownDipColor: "#F8FAFC", crownLength: 6.5,
            pointType: "bullet", pointColor: "#CBD5E1", nockType: "horn", nockColor: "#FEF08A",
            showCresting: true, crestingStartOffset: 0.25,
            crestingBands: [
                { id: 'l1', color: "#F59E0B", width: 0.25, offset: 0.10 },
                { id: 'l2', color: "#F8FAFC", width: 0.15, offset: 0.10 },
                { id: 'l3', color: "#F59E0B", width: 0.25, offset: 0.10 }
            ],
            servingColor: "#D97706"
        },
        urukhai: {
            name: "⚔️ Uruk-hai War Arrow",
            featherShape: "batman",
            feather1Color: "#475569", feather2Color: "#090D16", feather3Color: "#090D16",
            featherLength: 5.0,
            woodType: "carbon", enableShaftStain: false,
            enableCrownDip: false,
            pointType: "broadhead2", pointColor: "#334155", nockType: "plastic", nockColor: "#090D16",
            showCresting: true, crestingStartOffset: 0.40,
            crestingBands: [
                { id: 'u1', color: "#CBD5E1", width: 0.35, offset: 0.20 }
            ],
            servingColor: "#090D16"
        }
    };

    // ----------------------------------------------------------------------
    // DOM Elements Mapping
    // ----------------------------------------------------------------------
    const elements = {
        // SVG Viewport & Groups
        svg: document.getElementById('arrowSvg'),
        arrowViewport: document.getElementById('arrowViewport'),
        arrowGroup: document.getElementById('arrowGroup'),
        carbonSadFaceGroup: document.getElementById('carbonSadFaceGroup'),
        nockGroup: document.getElementById('nockGroup'),
        crownDipGroup: document.getElementById('crownDipGroup'),
        shaftGroup: document.getElementById('shaftGroup'),
        crestingGroup: document.getElementById('crestingGroup'),
        servingBackGroup: document.getElementById('servingBackGroup'),
        fletchingGroup: document.getElementById('fletchingGroup'),
        servingFrontGroup: document.getElementById('servingFrontGroup'),
        pointGroup: document.getElementById('pointGroup'),
        stageContainer: document.getElementById('stageContainer'),
        zoomLevelText: document.getElementById('zoomLevelText'),

        // Header Action Buttons
        undoBtn: document.getElementById('undoBtn'),
        redoBtn: document.getElementById('redoBtn'),
        smartRandomBtn: document.getElementById('smartRandomBtn'),
        exportBtn: document.getElementById('exportBtn'),
        exportMenu: document.getElementById('exportMenu'),
        exportPngBtn: document.getElementById('exportPngBtn'),
        exportSvgBtn: document.getElementById('exportSvgBtn'),
        copySpecsBtn: document.getElementById('copySpecsBtn'),

        // Header & Stage Info Pills
        headerWeight: document.getElementById('headerWeight'),
        headerFOC: document.getElementById('headerFOC'),
        headerSpine: document.getElementById('headerSpine'),
        infoStyleTag: document.getElementById('infoStyleTag'),
        infoWoodTag: document.getElementById('infoWoodTag'),
        infoPointTag: document.getElementById('infoPointTag'),
        infoNockTag: document.getElementById('infoNockTag'),

        // Sliders & Controls
        featherLength: document.getElementById('featherLength'),
        featherLengthVal: document.getElementById('featherLengthVal'),
        featherHeight: document.getElementById('featherHeight'),
        featherHeightVal: document.getElementById('featherHeightVal'),
        feather1Color: document.getElementById('feather1Color'), feather1Hex: document.getElementById('feather1Hex'),
        feather2Color: document.getElementById('feather2Color'), feather2Hex: document.getElementById('feather2Hex'),
        feather3Color: document.getElementById('feather3Color'), feather3Hex: document.getElementById('feather3Hex'),
        copyF1toF2: document.getElementById('copyF1toF2'),
        copyF2toF3: document.getElementById('copyF2toF3'),
        showFrontServing: document.getElementById('showFrontServing'),
        showBackServing: document.getElementById('showBackServing'),
        servingColor: document.getElementById('servingColor'), servingHex: document.getElementById('servingHex'),
        enableSpiralWrap: document.getElementById('enableSpiralWrap'),
        spiralWrapControls: document.getElementById('spiralWrapControls'),
        spiralWrapColor: document.getElementById('spiralWrapColor'), spiralWrapHex: document.getElementById('spiralWrapHex'),

        // Shaft Controls
        shaftDiameter: document.getElementById('shaftDiameter'), shaftDiameterVal: document.getElementById('shaftDiameterVal'),
        enableShaftStain: document.getElementById('enableShaftStain'),
        shaftStainControlsContainer: document.getElementById('shaftStainControlsContainer'),
        useSingleShaftColor: document.getElementById('useSingleShaftColor'),
        shaftBackColor: document.getElementById('shaftBackColor'), shaftBackHex: document.getElementById('shaftBackHex'),
        shaftFrontColor: document.getElementById('shaftFrontColor'), shaftFrontHex: document.getElementById('shaftFrontHex'),
        shaftFrontColorBox: document.getElementById('shaftFrontColorBox'),
        enableCrownDip: document.getElementById('enableCrownDip'),
        crownDipControls: document.getElementById('crownDipControls'),
        crownLength: document.getElementById('crownLength'), crownLengthVal: document.getElementById('crownLengthVal'),
        crownDipColor: document.getElementById('crownDipColor'), crownDipHex: document.getElementById('crownDipHex'),

        // Hardware Controls
        pointColor: document.getElementById('pointColor'), pointHex: document.getElementById('pointHex'),
        nockColor: document.getElementById('nockColor'), nockHex: document.getElementById('nockHex'),



        // Dynamic Cresting Controls
        showCresting: document.getElementById('showCresting'),
        crestingControlsContainer: document.getElementById('crestingControlsContainer'),
        crestingStartOffset: document.getElementById('crestingStartOffset'),
        crestingStartOffsetVal: document.getElementById('crestingStartOffsetVal'),
        addCrestingBandBtn: document.getElementById('addCrestingBandBtn'),
        crestingBandsList: document.getElementById('crestingBandsList'),

        // Specs Inputs
        arrowLength: document.getElementById('arrowLength'), arrowLengthVal: document.getElementById('arrowLengthVal'),
        drawWeight: document.getElementById('drawWeight'), drawWeightVal: document.getElementById('drawWeightVal'),
        pointWeight: document.getElementById('pointWeight'), pointWeightVal: document.getElementById('pointWeightVal'),

        // Specs Calculations Results
        calcTotalGrains: document.getElementById('calcTotalGrains'),
        calcTotalGrams: document.getElementById('calcTotalGrams'),
        calcFOC: document.getElementById('calcFOC'),
        calcFocStatus: document.getElementById('calcFocStatus'),
        calcSpine: document.getElementById('calcSpine'),
        calcGPI: document.getElementById('calcGPI'),

        // Preset Controls
        presetChipsContainer: document.getElementById('presetChipsContainer'),
        presetNameInput: document.getElementById('presetNameInput'),
        saveCustomPresetBtn: document.getElementById('saveCustomPresetBtn'),
        userPresetsSelect: document.getElementById('userPresetsSelect'),
        deleteUserPresetBtn: document.getElementById('deleteUserPresetBtn'),

        // Zoom Controls
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        zoomResetBtn: document.getElementById('zoomResetBtn')
    };

    // ----------------------------------------------------------------------
    // Initialization & State Sync
    // ----------------------------------------------------------------------
    function init() {
        bindEvents();
        loadUserPresetsFromStorage();
        saveStateToHistory(true);
        updateUIFromState();
        renderArrow();
    }

    // Ghost Sad Face 5-Second Timer & Fadeout Controller (Activated ONLY on clicking Carbon Fiber)
    let carbonGhostTimeout = null;
    let carbonFadeTimeout = null;

    function triggerCarbonGhost5s() {
        if (!elements.carbonSadFaceGroup) return;

        // Clear any existing timeouts
        if (carbonGhostTimeout) clearTimeout(carbonGhostTimeout);
        if (carbonFadeTimeout) clearTimeout(carbonFadeTimeout);

        elements.carbonSadFaceGroup.style.display = 'block';
        elements.carbonSadFaceGroup.style.opacity = '0';

        // Fade in to 0.5 opacity
        requestAnimationFrame(() => {
            if (elements.carbonSadFaceGroup) {
                elements.carbonSadFaceGroup.style.opacity = '0.5';
            }
        });

        // Disappear automatically after 5 seconds with smooth fade
        carbonGhostTimeout = setTimeout(() => {
            if (elements.carbonSadFaceGroup) {
                elements.carbonSadFaceGroup.style.opacity = '0';
                carbonFadeTimeout = setTimeout(() => {
                    if (elements.carbonSadFaceGroup && elements.carbonSadFaceGroup.style.opacity === '0') {
                        elements.carbonSadFaceGroup.style.display = 'none';
                    }
                }, 800);
            }
        }, 5000);
    }

    function hideCarbonGhost() {
        if (carbonGhostTimeout) clearTimeout(carbonGhostTimeout);
        if (carbonFadeTimeout) clearTimeout(carbonFadeTimeout);
        if (elements.carbonSadFaceGroup) {
            elements.carbonSadFaceGroup.style.opacity = '0';
            elements.carbonSadFaceGroup.style.display = 'none';
        }
    }

    // ----------------------------------------------------------------------
    // SVG Renderer Engine (Ultra-Crisp Vector Graphics)
    // ----------------------------------------------------------------------
    function renderArrow() {
        // Clear all SVG Groups
        elements.nockGroup.innerHTML = '';
        elements.crownDipGroup.innerHTML = '';
        elements.shaftGroup.innerHTML = '';
        elements.crestingGroup.innerHTML = '';
        elements.servingBackGroup.innerHTML = '';
        elements.fletchingGroup.innerHTML = '';
        elements.servingFrontGroup.innerHTML = '';
        elements.pointGroup.innerHTML = '';

        // Geometry Coordinates (Base SVG ViewBox: 0 0 950 240, Center Y = 120)
        const centerY = 120;
        const shaftDiameterMm = parseFloat(state.shaftDiameter || 8.0);
        const shaftH = (shaftDiameterMm / 8.0) * 8.0;
        const shaftY = centerY - (shaftH / 2);
        const shaftHeight = shaftH;
        const nockStartX = 40;
        const shaftStartX = 75;
        // Dynamic shaft length based on physical Arrow Length (baseline: 30.0" = 735px)
        const currentArrowLen = parseFloat(state.arrowLength || 30.0);
        const shaftLengthPx = (currentArrowLen / 30.0) * 735;
        const shaftEndX = shaftStartX + shaftLengthPx;

        // 1. RENDER SHAFT
        renderShaft(shaftStartX, shaftY, shaftLengthPx, shaftHeight);

        // 2. RENDER CROWN DIP (Inches to SVG PX)
        if (state.enableCrownDip) {
            const crownDipPx = parseFloat(state.crownLength || 5.5) * INCH_TO_PX;
            renderCrownDip(shaftStartX, shaftY, crownDipPx, shaftHeight);
        }

        // 3. RENDER FLETCHINGS
        const featherStartX = shaftStartX + 25;
        const scaleLen = parseFloat(state.featherLength) / 4.0;
        const featherPxLen = 140 * scaleLen;
        const featherPxHeight = (28.8 * (parseInt(state.featherHeight) / 100));

        renderFletchings(featherStartX, centerY, featherPxLen, featherPxHeight, shaftH);

        // 4. RENDER SERVINGS & DYNAMIC CRESTING POSITION
        let frontServingEndX = featherStartX + featherPxLen - 4 + 14;

        if (state.showBackServing) {
            // Back serving wrap (original position before fletchings start)
            renderServing(elements.servingBackGroup, featherStartX - 15, shaftY - 1, 14, shaftHeight + 2);
        }

        if (state.showFrontServing) {
            // Front serving wrap (overlaps feather end quill by ~4px)
            renderServing(elements.servingFrontGroup, featherStartX + featherPxLen - 4, shaftY - 1, 14, shaftHeight + 2);
            frontServingEndX = featherStartX + featherPxLen - 4 + 14;
        }

        // 5. RENDER DYNAMIC CRESTING BANDS (Inches Conversion)
        if (state.showCresting && state.crestingBands && state.crestingBands.length > 0) {
            renderCresting(frontServingEndX, shaftY, shaftHeight);
        }

        // 6. RENDER NOCK
        renderNock(nockStartX, centerY, shaftStartX, shaftH);

        // 7. RENDER ARROWHEAD (POINT)
        renderPoint(shaftEndX, centerY, shaftH);

        // Update Physics calculations and tags
        updatePhysicsAndSpecs();
    }

    // SVG Element Creator
    function createSVGElement(tag, attrs) {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (let key in attrs) {
            elem.setAttribute(key, attrs[key]);
        }
        return elem;
    }

    // Ultra-Sharp Vector Shaft & Material Render (Support for Carbon & Natural Woods)
    function renderShaft(x, y, width, height) {
        const naturalColor = naturalMaterialMap[state.woodType] || '#D97706';
        const isStained = state.enableShaftStain;

        const baseColorBack = isStained ? state.shaftBackColor : naturalColor;
        const baseColorFront = isStained ? (state.useSingleShaftColor ? state.shaftBackColor : state.shaftFrontColor) : naturalColor;

        const backWidth = (!isStained || state.useSingleShaftColor) ? width : 220;
        const frontWidth = width - backWidth;

        // Base Material Shaft Back
        const backShaft = createSVGElement('rect', {
            x: x, y: y, width: backWidth, height: height, rx: 1,
            fill: baseColorBack
        });
        elements.shaftGroup.appendChild(backShaft);

        if (isStained && !state.useSingleShaftColor && frontWidth > 0) {
            const frontShaft = createSVGElement('rect', {
                x: x + backWidth, y: y, width: frontWidth, height: height, rx: 1,
                fill: baseColorFront
            });
            elements.shaftGroup.appendChild(frontShaft);
        }

        // Carbon Pattern Overlay
        if (state.woodType === 'carbon') {
            const carbonOverlay = createSVGElement('rect', {
                x: x, y: y, width: width, height: height, rx: 1,
                fill: 'url(#carbonPattern)', opacity: '0.85'
            });
            elements.shaftGroup.appendChild(carbonOverlay);
        }

        // 3D Cylindrical Highlight Layer
        const highlightLayer = createSVGElement('rect', {
            x: x, y: y, width: width, height: height, rx: 1,
            fill: 'url(#shaftHighlight)'
        });
        elements.shaftGroup.appendChild(highlightLayer);

        // Vector Grain Lines (Subtle clean highlights)
        if (state.woodType !== 'carbon') {
            const grainYPositions = [y + (height * 0.25), y + (height * 0.5), y + (height * 0.75)];
            grainYPositions.forEach((lineY, idx) => {
                const line = createSVGElement('line', {
                    x1: x, y1: lineY, x2: x + width, y2: lineY,
                    stroke: idx === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                    'stroke-width': '0.7'
                });
                elements.shaftGroup.appendChild(line);
            });
        }

        // Crisp Top & Bottom Edges
        const topEdge = createSVGElement('line', {
            x1: x, y1: y, x2: x + width, y2: y,
            stroke: 'rgba(255,255,255,0.25)', 'stroke-width': '0.8'
        });
        const botEdge = createSVGElement('line', {
            x1: x, y1: y + height, x2: x + width, y2: y + height,
            stroke: 'rgba(0,0,0,0.35)', 'stroke-width': '0.8'
        });
        elements.shaftGroup.appendChild(topEdge);
        elements.shaftGroup.appendChild(botEdge);
    }

    // Crown Dip Render (Clean Lacquer Finish)
    function renderCrownDip(x, y, dipLengthPx, height) {
        const crown = createSVGElement('rect', {
            x: x, y: y - 0.5, width: dipLengthPx, height: height + 1, rx: 1,
            fill: state.crownDipColor
        });
        elements.crownDipGroup.appendChild(crown);

        const highlight = createSVGElement('rect', {
            x: x, y: y - 0.5, width: dipLengthPx, height: height + 1, rx: 1,
            fill: 'url(#shaftHighlight)'
        });
        elements.crownDipGroup.appendChild(highlight);

        // Clean subtle border edge line at lacquer boundary
        const edge = createSVGElement('line', {
            x1: x + dipLengthPx, y1: y - 0.5, x2: x + dipLengthPx, y2: y + height + 0.5,
            stroke: 'rgba(0,0,0,0.35)', 'stroke-width': '0.8'
        });
        elements.crownDipGroup.appendChild(edge);
    }

    // Cresting Render (All dimensions converted from Inches to SVG PX)
    function renderCresting(baseStartX, y, height) {
        const startOffsetPx = parseFloat(state.crestingStartOffset || 0.3) * INCH_TO_PX;
        let currX = baseStartX + startOffsetPx;

        state.crestingBands.forEach((band) => {
            const gapBeforePx = parseFloat(band.offset || 0) * INCH_TO_PX;
            const bandWidthPx = parseFloat(band.width || 0) * INCH_TO_PX;

            // Gap BEFORE this band
            currX += gapBeforePx;

            const rect = createSVGElement('rect', {
                x: currX, y: y - 0.5, width: bandWidthPx, height: height + 1,
                fill: band.color, stroke: 'rgba(0,0,0,0.3)', 'stroke-width': '0.5'
            });
            elements.crestingGroup.appendChild(rect);

            // Advance X by this band's width for next iteration
            currX += bandWidthPx;
        });
    }

    // Thread Servings Render
    function renderServing(group, x, y, width, height) {
        const wrap = createSVGElement('rect', {
            x: x, y: y, width: width, height: height, rx: 1,
            fill: state.servingColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.6'
        });
        group.appendChild(wrap);

        for (let tx = x + 2; tx < x + width; tx += 3) {
            const threadLine = createSVGElement('line', {
                x1: tx, y1: y, x2: tx, y2: y + height,
                stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.8'
            });
            group.appendChild(threadLine);
        }
    }

    // Fletchings (Feathers) Render with Dense Vector Barb & Down Lines
    function renderFletchings(startX, centerY, len, h, shaftH = 8.0) {
        const topOffset = shaftH / 2;
        const topBaseY = centerY - topOffset;
        const botBaseY = centerY + topOffset;

        // Feather 1 (Top - F1)
        const pathF1 = getFeatherPath(startX, topBaseY, len, h, 'top', state.featherShape);
        const f1 = createSVGElement('path', {
            d: pathF1, fill: state.feather1Color,
            stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.8'
        });
        elements.fletchingGroup.appendChild(f1);
        renderFeatherBarbs(startX, topBaseY, len, h, 'top', state.feather1Color);

        // Feather 2 (Bottom - F2)
        const pathF2 = getFeatherPath(startX, botBaseY, len, h, 'bottom', state.featherShape);
        const f2 = createSVGElement('path', {
            d: pathF2, fill: state.feather2Color,
            stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.8'
        });
        elements.fletchingGroup.appendChild(f2);
        renderFeatherBarbs(startX, botBaseY, len, h, 'bottom', state.feather2Color);

        // Feather 3 (Middle perspective - F3) - Solid 3D Cut Profile
        const pathF3 = getFeatherPath(startX, centerY, len, h * 0.65, 'middle', state.featherShape);
        const f3Shadow = createSVGElement('path', {
            d: pathF3, fill: 'rgba(15, 23, 42, 0.25)', transform: 'translate(0, 1.5)'
        });
        const f3 = createSVGElement('path', {
            d: pathF3, fill: state.feather3Color,
            stroke: 'rgba(0,0,0,0.35)', 'stroke-width': '0.8'
        });
        elements.fletchingGroup.appendChild(f3Shadow);
        elements.fletchingGroup.appendChild(f3);
        renderFeatherBarbs(startX, centerY, len, h * 0.65, 'middle', state.feather3Color);

        // Quill / Rachis Spine Lines (Flush attached to shaft surface)
        const quillTop = createSVGElement('line', {
            x1: startX, y1: topBaseY, x2: startX + len, y2: topBaseY,
            stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '1.4'
        });
        const quillTopShine = createSVGElement('line', {
            x1: startX, y1: topBaseY, x2: startX + len, y2: topBaseY,
            stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '0.7'
        });

        const quillBot = createSVGElement('line', {
            x1: startX, y1: botBaseY, x2: startX + len, y2: botBaseY,
            stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '1.4'
        });
        const quillBotShine = createSVGElement('line', {
            x1: startX, y1: botBaseY, x2: startX + len, y2: botBaseY,
            stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '0.7'
        });

        elements.fletchingGroup.appendChild(quillTop);
        elements.fletchingGroup.appendChild(quillTopShine);
        elements.fletchingGroup.appendChild(quillBot);
        elements.fletchingGroup.appendChild(quillBotShine);

        // Render Spiral Thread Binding Wrap tightly across shaft
        renderSpiralWrap(startX, centerY, len, shaftH);
    }

    // Spiral Thread Binding around Shaft Surface Engine
    function renderSpiralWrap(startX, centerY, len, shaftH = 8.0) {
        if (!state.enableSpiralWrap) return;

        const tColor = state.spiralWrapColor || '#FEF08A';
        const pitch = 18; // Distance in PX between spiral loops
        const numTurns = Math.floor(len / pitch);
        const threadH = (shaftH / 2) + 1.6; // Wraps tightly around the shaft surface!

        for (let i = 0; i <= numTurns; i++) {
            const x1 = startX + (i * pitch);
            const x2 = x1 + (pitch * 0.75);

            if (x1 > startX + len) break;

            // Spiral thread arc wrapping tightly diagonally around shaft surface
            const threadShadow = createSVGElement('path', {
                d: `M ${x1} ${centerY - threadH} Q ${x1 + (pitch * 0.35)} ${centerY}, ${x2} ${centerY + threadH}`,
                fill: 'none', stroke: 'rgba(15, 23, 42, 0.4)', 'stroke-width': '1.6'
            });

            const threadPath = createSVGElement('path', {
                d: `M ${x1} ${centerY - threadH} Q ${x1 + (pitch * 0.35)} ${centerY}, ${x2} ${centerY + threadH}`,
                fill: 'none', stroke: tColor, 'stroke-width': '1.2', 'stroke-linecap': 'round'
            });

            const threadHighlight = createSVGElement('path', {
                d: `M ${x1} ${centerY - threadH} Q ${x1 + (pitch * 0.35)} ${centerY}, ${x2} ${centerY + threadH}`,
                fill: 'none', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '0.5'
            });

            elements.fletchingGroup.appendChild(threadShadow);
            elements.fletchingGroup.appendChild(threadPath);
            elements.fletchingGroup.appendChild(threadHighlight);
        }
    }

    // Vector Feather Barb Lines
    function renderFeatherBarbs(x, baseY, len, h, side, fColor) {
        const dir = side === 'top' ? -1 : (side === 'bottom' ? 1 : 0.55);
        const isFluFlu = state.featherShape === 'flu-flu';
        const numBarbs = isFluFlu ? 48 : 6;

        for (let i = 1; i <= numBarbs; i++) {
            const bx = x + (i * (len / (numBarbs + 1)));

            if (isFluFlu) {
                const randAngleOffset = ((i % 7) - 3) * 2.5;
                const barbHeightMult = 0.75 + ((i % 5) * 0.08);

                const barbLine = createSVGElement('line', {
                    x1: bx, y1: baseY,
                    x2: bx - 4 + randAngleOffset, y2: baseY + (dir * h * barbHeightMult),
                    stroke: fColor,
                    'stroke-width': '0.9',
                    opacity: '0.8'
                });
                elements.fletchingGroup.appendChild(barbLine);

                const detailLine = createSVGElement('line', {
                    x1: bx, y1: baseY,
                    x2: bx - 4 + randAngleOffset, y2: baseY + (dir * h * barbHeightMult),
                    stroke: 'rgba(0,0,0,0.2)',
                    'stroke-width': '0.4'
                });
                elements.fletchingGroup.appendChild(detailLine);
            } else {
                const barbLine = createSVGElement('line', {
                    x1: bx, y1: baseY,
                    x2: bx - 8, y2: baseY + (dir * h * 0.7),
                    stroke: 'rgba(0,0,0,0.14)', 'stroke-width': '0.7'
                });
                elements.fletchingGroup.appendChild(barbLine);
            }
        }
    }

    // Smooth Feather Path Generator
    function getFeatherPath(x, baseY, len, h, side, shape) {
        let dir = side === 'top' ? -1 : (side === 'bottom' ? 1 : 0.55);
        if (side === 'middle') {
            if (shape === 'flu-flu') {
                let fluMidD = `M ${x} ${baseY}`;
                const fluSpikes = 36;
                const spikeW = len / fluSpikes;
                for (let i = 0; i < fluSpikes; i++) {
                    const px1 = x + (i * spikeW);
                    const pxMid = px1 + (spikeW * 0.5);
                    const px2 = px1 + spikeW;
                    const hMult = 0.7 + ((i % 4) * 0.08);
                    const sY = baseY + (0.55 * h * hMult);
                    fluMidD += ` L ${px1} ${baseY} L ${pxMid} ${sY} L ${px2} ${baseY}`;
                }
                return fluMidD + ` Z`;
            }
        }
        const topY = baseY + (dir * h);

        switch (shape) {
            case 'banana':
                return `M ${x} ${baseY} Q ${x + (len * 0.25)} ${baseY + (dir * h * 1.1)}, ${x + (len * 0.6)} ${baseY + (dir * h * 1.05)} Q ${x + (len * 0.85)} ${baseY + (dir * h * 0.8)}, ${x + len} ${baseY} L ${x} ${baseY} Z`;

            case 'parabolic':
                return `M ${x} ${baseY} Q ${x + (len * 0.12)} ${baseY + (dir * h * 1.04)}, ${x + (len * 0.32)} ${topY} Q ${x + (len * 0.72)} ${baseY + (dir * h * 0.98)}, ${x + len} ${baseY} L ${x} ${baseY} Z`;

            case 'batman':
                return `M ${x} ${baseY} Q ${x + (len * 0.08)} ${topY}, ${x + (len * 0.22)} ${topY} Q ${x + (len * 0.38)} ${baseY + (dir * h * 0.35)}, ${x + (len * 0.55)} ${topY} Q ${x + (len * 0.8)} ${baseY + (dir * h * 0.95)}, ${x + len} ${baseY} L ${x} ${baseY} Z`;

            case 'traditional':
                return `M ${x} ${baseY} L ${x + (len * 0.12)} ${topY} L ${x + (len * 0.8)} ${topY} Q ${x + (len * 0.92)} ${baseY + (dir * h * 0.4)}, ${x + len} ${baseY} L ${x} ${baseY} Z`;

            case 'flu-flu':
                let fluD = `M ${x} ${baseY}`;
                const fluSpikes = 36;
                const spikeW = len / fluSpikes;
                for (let i = 0; i < fluSpikes; i++) {
                    const px1 = x + (i * spikeW);
                    const pxMid = px1 + (spikeW * 0.5);
                    const px2 = px1 + spikeW;
                    const hMult = 0.75 + ((i % 5) * 0.06);
                    const sY = baseY + (dir * h * hMult);
                    fluD += ` L ${px1} ${baseY} L ${pxMid} ${sY} L ${px2} ${baseY}`;
                }
                return fluD + ` Z`;

            case 'legolas-style':
                return `M ${x + (len * 0.12)} ${baseY} L ${x} ${topY} Q ${x + (len * 0.4)} ${baseY + (dir * h * 1.02)}, ${x + (len * 0.7)} ${baseY + (dir * h * 0.45)} Q ${x + (len * 0.9)} ${baseY + (dir * h * 0.15)}, ${x + len} ${baseY} L ${x + (len * 0.12)} ${baseY} Z`;

            case 'shield':
            default:
                return `M ${x} ${baseY} Q ${x + (len * 0.08)} ${baseY + (dir * h * 0.7)}, ${x + (len * 0.15)} ${topY} Q ${x + (len * 0.3)} ${baseY + (dir * h * 1.02)}, ${x + (len * 0.7)} ${baseY + (dir * h * 0.65)} Q ${x + (len * 0.9)} ${baseY + (dir * h * 0.3)}, ${x + len} ${baseY} L ${x} ${baseY} Z`;
        }
    }

    // Dynamic Nock Renderer (Scales with Shaft Diameter)
    function renderNock(x, centerY, shaftStartX, shaftH = 8.0) {
        const nockColor = state.nockColor;
        const woodShaftColor = state.enableShaftStain ? state.shaftBackColor : (naturalMaterialMap[state.woodType] || '#D97706');
        const halfH = shaftH / 2;
        const topY = centerY - halfH;
        const botY = centerY + halfH;

        if (state.nockType === 'selfnock') {
            const topProng = createSVGElement('path', {
                d: `M ${x + 6} ${topY} L ${shaftStartX} ${topY} L ${shaftStartX} ${centerY - 1.5} L ${x + 16} ${centerY - 1.5} Q ${x + 2} ${centerY - 1.5}, ${x + 6} ${topY} Z`,
                fill: woodShaftColor, stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.7'
            });
            const topProngShine = createSVGElement('path', {
                d: `M ${x + 6} ${topY} L ${shaftStartX} ${topY} L ${shaftStartX} ${centerY - 1.5} L ${x + 16} ${centerY - 1.5} Q ${x + 2} ${centerY - 1.5}, ${x + 6} ${topY} Z`,
                fill: 'url(#shaftHighlight)'
            });

            const botProng = createSVGElement('path', {
                d: `M ${x + 6} ${botY} L ${shaftStartX} ${botY} L ${shaftStartX} ${centerY + 1.5} L ${x + 16} ${centerY + 1.5} Q ${x + 2} ${centerY + 1.5}, ${x + 6} ${botY} Z`,
                fill: woodShaftColor, stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.7'
            });
            const botProngShine = createSVGElement('path', {
                d: `M ${x + 6} ${botY} L ${shaftStartX} ${botY} L ${shaftStartX} ${centerY + 1.5} L ${x + 16} ${centerY + 1.5} Q ${x + 2} ${centerY + 1.5}, ${x + 6} ${botY} Z`,
                fill: 'url(#shaftHighlight)'
            });

            const slotRim = createSVGElement('path', {
                d: `M ${x - 2} ${centerY - 1.5} L ${x + 16} ${centerY - 1.5} Q ${x + 20} ${centerY}, ${x + 16} ${centerY + 1.5} L ${x - 2} ${centerY + 1.5}`,
                fill: 'none', stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
            });

            const threadWrap = createSVGElement('rect', {
                x: x + 20, y: topY - 1, width: 12, height: shaftH + 2, rx: 1,
                fill: nockColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.6'
            });

            elements.nockGroup.appendChild(topProng);
            elements.nockGroup.appendChild(topProngShine);
            elements.nockGroup.appendChild(botProng);
            elements.nockGroup.appendChild(botProngShine);
            elements.nockGroup.appendChild(slotRim);
            elements.nockGroup.appendChild(threadWrap);

            for (let tx = x + 22; tx < x + 30; tx += 2.5) {
                const tline = createSVGElement('line', {
                    x1: tx, y1: topY - 1, x2: tx, y2: botY + 1,
                    stroke: 'rgba(0,0,0,0.3)', 'stroke-width': '0.6'
                });
                elements.nockGroup.appendChild(tline);
            }
        } else if (state.nockType === 'horn') {
            const hornBody = createSVGElement('path', {
                d: `M ${x} ${topY - 1} L ${x + 12} ${topY - 2} L ${shaftStartX} ${topY} L ${shaftStartX} ${botY} L ${x + 12} ${botY + 2} L ${x} ${botY + 1} Z`,
                fill: '#1E293B', stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
            });
            const hornHighlight = createSVGElement('path', {
                d: `M ${x} ${topY - 1} L ${x + 12} ${topY - 2} L ${shaftStartX} ${topY} L ${shaftStartX} ${botY} L ${x + 12} ${botY + 2} L ${x} ${botY + 1} Z`,
                fill: 'url(#nockHighlight)'
            });
            const slot = createSVGElement('path', {
                d: `M ${x - 2} ${centerY - 1.5} L ${x + 15} ${centerY - 1.5} Q ${x + 18} ${centerY}, ${x + 15} ${centerY + 1.5} L ${x - 2} ${centerY + 1.5} Z`,
                fill: 'none', stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
            });
            elements.nockGroup.appendChild(hornBody);
            elements.nockGroup.appendChild(hornHighlight);
            elements.nockGroup.appendChild(slot);
        } else {
            const plasticNock = createSVGElement('path', {
                d: `M ${x + 5} ${topY - 1} L ${x + 15} ${topY - 2} L ${shaftStartX} ${topY} L ${shaftStartX} ${botY} L ${x + 15} ${botY + 2} L ${x + 5} ${botY + 1} Z`,
                fill: nockColor, stroke: 'rgba(0,0,0,0.3)', 'stroke-width': '0.8'
            });
            const plasticHighlight = createSVGElement('path', {
                d: `M ${x + 5} ${topY - 1} L ${x + 15} ${topY - 2} L ${shaftStartX} ${topY} L ${shaftStartX} ${botY} L ${x + 15} ${botY + 2} L ${x + 5} ${botY + 1} Z`,
                fill: 'url(#nockHighlight)'
            });
            const groove = createSVGElement('path', {
                d: `M ${x + 2} ${centerY - 2} L ${x + 16} ${centerY - 1} L ${x + 16} ${centerY + 1} L ${x + 2} ${centerY + 2} Z`,
                fill: 'rgba(0,0,0,0.5)'
            });
            elements.nockGroup.appendChild(plasticNock);
            elements.nockGroup.appendChild(plasticHighlight);
            elements.nockGroup.appendChild(groove);
        }
    }

    // Dynamic Point Renderer (Scales with Shaft Diameter)
    function renderPoint(shaftEndX, centerY, shaftH = 8.0) {
        const pColor = state.pointColor;
        const halfH = shaftH / 2;
        const topY = centerY - halfH;
        const botY = centerY + halfH;

        // Render metal ferrule only for non-blunt points
        if (state.pointType !== 'blunt') {
            const ferrule = createSVGElement('rect', {
                x: shaftEndX - 2, y: topY - 0.5, width: 14, height: shaftH + 1.0, rx: 1,
                fill: pColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.6'
            });
            const ferruleShine = createSVGElement('rect', {
                x: shaftEndX - 2, y: topY - 0.5, width: 14, height: shaftH + 1.0, rx: 1,
                fill: 'url(#shaftHighlight)'
            });
            elements.pointGroup.appendChild(ferrule);
            elements.pointGroup.appendChild(ferruleShine);
        }

        const px = shaftEndX + 12;

        switch (state.pointType) {
            case 'bullet':
                const bullet = createSVGElement('path', {
                    d: `M ${px} ${topY - 0.5} C ${px + 16} ${topY - 0.5}, ${px + 26} ${centerY - 3}, ${px + 27} ${centerY} C ${px + 26} ${centerY + 3}, ${px + 16} ${botY + 0.5}, ${px} ${botY + 0.5} Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
                });
                const bulletShine = createSVGElement('path', {
                    d: `M ${px} ${topY - 0.5} C ${px + 16} ${topY - 0.5}, ${px + 26} ${centerY - 3}, ${px + 27} ${centerY} Z`,
                    fill: 'url(#shaftHighlight)'
                });
                elements.pointGroup.appendChild(bullet);
                elements.pointGroup.appendChild(bulletShine);
                break;

            case 'broadhead2':
                const blade2 = createSVGElement('path', {
                    d: `M ${px} ${topY} L ${px + 8} 96 L ${px + 45} ${centerY} L ${px + 8} 144 L ${px} ${botY} Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1'
                });
                const blade2Shine = createSVGElement('path', {
                    d: `M ${px} ${topY} L ${px + 8} 96 L ${px + 45} ${centerY} Z`,
                    fill: 'rgba(255,255,255,0.25)'
                });
                const spineLine = createSVGElement('line', {
                    x1: px, y1: centerY, x2: px + 45, y2: centerY,
                    stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1.5'
                });
                elements.pointGroup.appendChild(blade2);
                elements.pointGroup.appendChild(blade2Shine);
                elements.pointGroup.appendChild(spineLine);
                break;

            case 'broadhead3':
                const blade3 = createSVGElement('path', {
                    d: `M ${px} ${topY} L ${px + 12} 100 L ${px + 40} ${centerY} L ${px + 12} 140 L ${px} ${botY} Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1'
                });
                const bladeCutout = createSVGElement('circle', {
                    cx: px + 16, cy: centerY, r: 4, fill: '#090D16'
                });
                elements.pointGroup.appendChild(blade3);
                elements.pointGroup.appendChild(bladeCutout);
                break;

            case 'bodkin':
                const bodkin = createSVGElement('path', {
                    d: `M ${px} ${topY - 0.5} L ${px + 10} ${topY - 1.5} L ${px + 48} ${centerY} L ${px + 10} ${botY + 1.5} L ${px} ${botY + 0.5} Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1'
                });
                const bodkinFacet = createSVGElement('path', {
                    d: `M ${px} ${topY - 0.5} L ${px + 10} ${topY - 1.5} L ${px + 48} ${centerY} Z`,
                    fill: 'rgba(255,255,255,0.3)'
                });
                elements.pointGroup.appendChild(bodkin);
                elements.pointGroup.appendChild(bodkinFacet);
                break;

            case 'blunt':
                const cylH = shaftH + 3.6;
                const cylTop = centerY - (cylH / 2);
                const capX = shaftEndX - 2;
                const capLen = 24;

                // Single Clean Cylindrical Rubber/Metal Cap (Nasadka Walcowa)
                const bluntCylinder = createSVGElement('rect', {
                    x: capX, y: cylTop, width: capLen, height: cylH, rx: 2.0,
                    fill: pColor, stroke: 'rgba(0,0,0,0.7)', 'stroke-width': '1'
                });
                // Top cylindrical shine beam
                const bluntShine = createSVGElement('rect', {
                    x: capX, y: cylTop + 1, width: capLen, height: cylH * 0.38, rx: 1,
                    fill: 'rgba(255,255,255,0.25)'
                });
                // Vertical grip ribs
                const rib1 = createSVGElement('line', {
                    x1: capX + 8, y1: cylTop + 1, x2: capX + 8, y2: cylTop + cylH - 1,
                    stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '1.2'
                });
                const rib2 = createSVGElement('line', {
                    x1: capX + 16, y1: capX + 16 < capX + capLen ? cylTop + 1 : cylTop + 1, x2: capX + 16, y2: cylTop + cylH - 1,
                    stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '1.2'
                });

                elements.pointGroup.appendChild(bluntCylinder);
                elements.pointGroup.appendChild(bluntShine);
                elements.pointGroup.appendChild(rib1);
                elements.pointGroup.appendChild(rib2);
                break;

            case 'field':
            default:
                const field = createSVGElement('path', {
                    d: `M ${px} ${topY - 0.5} L ${px + 20} ${topY + 1} L ${px + 32} ${centerY} L ${px + 20} ${botY - 1} L ${px} ${botY + 0.5} Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
                });
                const fieldShine = createSVGElement('path', {
                    d: `M ${px} ${topY - 0.5} L ${px + 20} ${topY + 1} L ${px + 32} ${centerY} Z`,
                    fill: 'url(#shaftHighlight)'
                });
                elements.pointGroup.appendChild(field);
                elements.pointGroup.appendChild(fieldShine);
                break;
        }
    }







    // Point Renderer
    function renderPoint(shaftEndX, centerY) {
        const pColor = state.pointColor;

        const ferrule = createSVGElement('rect', {
            x: shaftEndX - 2, y: centerY - 5.5, width: 14, height: 11, rx: 1,
            fill: pColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.6'
        });
        const ferruleShine = createSVGElement('rect', {
            x: shaftEndX - 2, y: centerY - 5.5, width: 14, height: 11, rx: 1,
            fill: 'url(#shaftHighlight)'
        });
        elements.pointGroup.appendChild(ferrule);
        elements.pointGroup.appendChild(ferruleShine);

        const px = shaftEndX + 12;

        switch (state.pointType) {
            case 'bullet':
                const bullet = createSVGElement('path', {
                    d: `M ${px} 114.5 C ${px + 16} 114.5, ${px + 26} 117, ${px + 27} 120 C ${px + 26} 123, ${px + 16} 125.5, ${px} 125.5 Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
                });
                const bulletShine = createSVGElement('path', {
                    d: `M ${px} 114.5 C ${px + 16} 114.5, ${px + 26} 117, ${px + 27} 120 Z`,
                    fill: 'url(#shaftHighlight)'
                });
                elements.pointGroup.appendChild(bullet);
                elements.pointGroup.appendChild(bulletShine);
                break;

            case 'broadhead2':
                const blade2 = createSVGElement('path', {
                    d: `M ${px} 115 L ${px + 8} 96 L ${px + 45} 120 L ${px + 8} 144 L ${px} 125 Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1'
                });
                const blade2Shine = createSVGElement('path', {
                    d: `M ${px} 115 L ${px + 8} 96 L ${px + 45} 120 Z`,
                    fill: 'rgba(255,255,255,0.25)'
                });
                const spineLine = createSVGElement('line', {
                    x1: px, y1: 120, x2: px + 45, y2: 120,
                    stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1.5'
                });
                elements.pointGroup.appendChild(blade2);
                elements.pointGroup.appendChild(blade2Shine);
                elements.pointGroup.appendChild(spineLine);
                break;

            case 'broadhead3':
                const blade3 = createSVGElement('path', {
                    d: `M ${px} 115 L ${px + 12} 100 L ${px + 40} 120 L ${px + 12} 140 L ${px} 125 Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1'
                });
                const bladeCutout = createSVGElement('circle', {
                    cx: px + 16, cy: 120, r: 4, fill: '#090D16'
                });
                elements.pointGroup.appendChild(blade3);
                elements.pointGroup.appendChild(bladeCutout);
                break;

            case 'bodkin':
                const bodkin = createSVGElement('path', {
                    d: `M ${px} 114.5 L ${px + 10} 113 L ${px + 48} 120 L ${px + 10} 127 L ${px} 125.5 Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '1'
                });
                const bodkinFacet = createSVGElement('path', {
                    d: `M ${px} 114.5 L ${px + 10} 113 L ${px + 48} 120 Z`,
                    fill: 'rgba(255,255,255,0.3)'
                });
                elements.pointGroup.appendChild(bodkin);
                elements.pointGroup.appendChild(bodkinFacet);
                break;

            case 'blunt':
                const blunt = createSVGElement('path', {
                    d: `M ${px} 113 L ${px + 22} 110 L ${px + 24} 130 L ${px} 127 Z`,
                    fill: '#1E293B', stroke: 'rgba(0,0,0,0.6)', 'stroke-width': '1'
                });
                const grooves = createSVGElement('line', {
                    x1: px + 23, y1: 110, x2: px + 23, y2: 130,
                    stroke: 'rgba(255,255,255,0.2)', 'stroke-width': '2'
                });
                elements.pointGroup.appendChild(blunt);
                elements.pointGroup.appendChild(grooves);
                break;

            case 'field':
            default:
                const field = createSVGElement('path', {
                    d: `M ${px} 114.5 L ${px + 20} 116 L ${px + 32} 120 L ${px + 20} 124 L ${px} 125.5 Z`,
                    fill: pColor, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '0.8'
                });
                const fieldShine = createSVGElement('path', {
                    d: `M ${px} 114.5 L ${px + 20} 116 L ${px + 32} 120 Z`,
                    fill: 'rgba(255,255,255,0.3)'
                });
                elements.pointGroup.appendChild(field);
                elements.pointGroup.appendChild(fieldShine);
                break;
        }
    }

    // ----------------------------------------------------------------------
    // Dynamic Cresting Bands UI Engine (Inches Dimension Sliders)
    // ----------------------------------------------------------------------
    function renderCrestingBandsUI() {
        if (!elements.crestingBandsList) return;
        elements.crestingBandsList.innerHTML = '';

        if (!state.crestingBands || state.crestingBands.length === 0) {
            elements.crestingBandsList.innerHTML = '<p class="subtext" style="text-align:center; padding:12px;">No cresting bands added. Click "➕ Add New Cresting Band" above!</p>';
            return;
        }

        state.crestingBands.forEach((band, idx) => {
            const card = document.createElement('div');
            card.className = 'crest-row-card';

            const offsetInchStr = `${parseFloat(band.offset || 0).toFixed(2)}"`;
            const widthInchStr = `${parseFloat(band.width || 0.25).toFixed(2)}"`;

            card.innerHTML = `
                <div class="crest-row-header">
                    <span>Band #${idx + 1}</span>
                    <button class="copy-btn btn-danger remove-band-btn" data-index="${idx}" title="Delete this band" style="margin-left:auto; padding:2px 8px; font-size:0.7rem;">🗑️ Delete</button>
                </div>
                <div class="crest-row-body">
                    <label style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">Band Color:</label>
                    <div class="color-input-wrapper" style="flex:1;">
                        <input type="color" class="band-color-input" data-index="${idx}" value="${band.color}">
                        <span class="color-hex">${band.color.toUpperCase()}</span>
                    </div>
                </div>
                <div class="crest-row-sliders">
                    <div class="mini-control">
                        <label>Gap Before: <span>${offsetInchStr}</span></label>
                        <input type="range" class="band-offset-slider" data-index="${idx}" min="0.0" max="1.5" step="0.05" value="${band.offset}">
                    </div>
                    <div class="mini-control">
                        <label>Width: <span>${widthInchStr}</span></label>
                        <input type="range" class="band-width-slider" data-index="${idx}" min="0.05" max="1.5" step="0.05" value="${band.width}">
                    </div>
                </div>
            `;

            elements.crestingBandsList.appendChild(card);
        });

        // Event listeners for dynamic bands
        elements.crestingBandsList.querySelectorAll('.remove-band-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                state.crestingBands.splice(idx, 1);
                renderCrestingBandsUI();
                triggerUpdate();
            });
        });

        elements.crestingBandsList.querySelectorAll('.band-color-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const val = e.target.value;
                state.crestingBands[idx].color = val;
                e.target.nextElementSibling.textContent = val.toUpperCase();
                triggerUpdate();
            });
        });

        elements.crestingBandsList.querySelectorAll('.band-width-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const val = parseFloat(e.target.value);
                state.crestingBands[idx].width = val;
                e.target.previousElementSibling.querySelector('span').textContent = `${val.toFixed(2)}"`;
                triggerUpdate();
            });
        });

        elements.crestingBandsList.querySelectorAll('.band-offset-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const val = parseFloat(e.target.value);
                state.crestingBands[idx].offset = val;
                e.target.previousElementSibling.querySelector('span').textContent = `${val.toFixed(2)}"`;
                triggerUpdate();
            });
        });
    }

    function addCrestingBand() {
        if (!state.crestingBands) state.crestingBands = [];
        
        const colors = ['#EF4444', '#F8FAFC', '#1E3A8A', '#F59E0B', '#10B981', '#9333EA'];
        const randomColor = colors[state.crestingBands.length % colors.length];

        state.crestingBands.push({
            id: 'b_' + Date.now(),
            color: randomColor,
            width: 0.25,
            offset: 0.15
        });

        renderCrestingBandsUI();
        triggerUpdate();
    }

    // ----------------------------------------------------------------------
    // Physics & Archery Specs Calculator
    // ----------------------------------------------------------------------
    function updatePhysicsAndSpecs() {
        const len = parseFloat(state.arrowLength);
        const dw = parseInt(state.drawWeight);
        const pw = parseInt(state.pointWeight);

        const woodGpiMap = {
            cedar: 11.2,
            spruce: 9.8,
            pine: 11.8,
            bamboo: 10.5,
            douglas: 13.5,
            carbon: 8.5
        };

        const gpi = woodGpiMap[state.woodType] || 11.2;
        const shaftWeightGrains = len * gpi;
        const fletchingWeightGrains = 24;
        const nockWeightGrains = 12;
        const totalGrains = Math.round(shaftWeightGrains + pw + fletchingWeightGrains + nockWeightGrains);
        const totalGrams = (totalGrains * 0.0647989).toFixed(1);

        const balanceDist = (len * 0.5) + ((pw - 80) * 0.04);
        const focPercent = (((balanceDist - (len / 2)) / len) * 100).toFixed(1);

        let focStatus = "Standard (Target/3D)";
        if (focPercent > 12) focStatus = "High (Hunting/3D)";
        if (focPercent < 9) focStatus = "Low (Target)";

        const baseSpine = Math.round(dw + ((len - 28) * 4) + ((pw - 100) * 0.2));
        const spineRange = `${baseSpine - 2}-${baseSpine + 3}#`;

        // Update UI Text
        elements.calcTotalGrains.textContent = `${totalGrains} gr`;
        elements.calcTotalGrams.textContent = `(${totalGrams} g)`;
        elements.calcFOC.textContent = `${focPercent}%`;
        elements.calcFocStatus.textContent = focStatus;
        elements.calcSpine.textContent = spineRange;
        elements.calcGPI.textContent = `${gpi} gr/in`;

        // Update Header Pills
        elements.headerWeight.textContent = `${totalGrains} gr`;
        elements.headerFOC.textContent = `${focPercent}%`;
        elements.headerSpine.textContent = spineRange;

        // Update Quick Info Tags under Canvas
        const matNames = {
            cedar: 'Port Orford Cedar',
            spruce: 'Sitka Spruce',
            pine: 'Traditional Pine',
            bamboo: 'Asian Bamboo',
            douglas: 'Douglas Fir',
            carbon: 'Carbon Fiber'
        };

        elements.infoStyleTag.textContent = state.featherShape.toUpperCase();
        elements.infoWoodTag.textContent = matNames[state.woodType] || state.woodType.toUpperCase();
        elements.infoPointTag.textContent = `${state.pointType.toUpperCase()} (${pw}gr)`;
        elements.infoNockTag.textContent = state.nockType.toUpperCase();
    }

    // ----------------------------------------------------------------------
    // Viewport Pan & Zoom Controls
    // ----------------------------------------------------------------------
    function setZoomAndPan(zoomLevel, panX = state.panX, panY = state.panY) {
        state.zoom = Math.min(Math.max(zoomLevel, 0.5), 3.0);
        state.panX = panX;
        state.panY = panY;

        elements.zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
        elements.arrowGroup.setAttribute('transform', `translate(${state.panX}, ${state.panY}) scale(${state.zoom})`);
    }

    // ----------------------------------------------------------------------
    // UI Event Binding & Syncing
    // ----------------------------------------------------------------------
    function bindEvents() {
        // Tab Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                e.currentTarget.classList.add('active');
                const tabId = e.currentTarget.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Background Selector
        document.querySelectorAll('.bg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                const bgType = e.currentTarget.dataset.bg;
                state.stageBg = bgType;
                elements.stageContainer.className = `stage-container bg-${bgType}`;
            });
        });

        // Interactive Zoom & Pan Drag Controls
        elements.zoomInBtn.addEventListener('click', () => setZoomAndPan(state.zoom + 0.2));
        elements.zoomOutBtn.addEventListener('click', () => setZoomAndPan(state.zoom - 0.2));
        elements.zoomResetBtn.addEventListener('click', () => setZoomAndPan(1.0, 0, 0));

        // Viewport Dragging (Pan)
        elements.arrowViewport.addEventListener('mousedown', (e) => {
            isPanning = true;
            panStartX = e.clientX - state.panX;
            panStartY = e.clientY - state.panY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            state.panX = e.clientX - panStartX;
            state.panY = e.clientY - panStartY;
            setZoomAndPan(state.zoom, state.panX, state.panY);
        });

        window.addEventListener('mouseup', () => {
            isPanning = false;
        });

        // Mobile Touch Panning & Pinch Gestures
        let initialPinchDistance = 0;
        let initialZoom = 1;

        elements.arrowViewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isPanning = true;
                panStartX = e.touches[0].clientX - state.panX;
                panStartY = e.touches[0].clientY - state.panY;
            } else if (e.touches.length === 2) {
                isPanning = false;
                initialPinchDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialZoom = state.zoom;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDistance > 0) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const factor = dist / initialPinchDistance;
                setZoomAndPan(Math.min(Math.max(initialZoom * factor, 0.5), 3.0), state.panX, state.panY);
            } else if (isPanning && e.touches.length === 1) {
                state.panX = e.touches[0].clientX - panStartX;
                state.panY = e.touches[0].clientY - panStartY;
                setZoomAndPan(state.zoom, state.panX, state.panY);
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            isPanning = false;
            initialPinchDistance = 0;
        });

        // Mouse Wheel Zoom
        elements.arrowViewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.12 : -0.12;
            setZoomAndPan(state.zoom + delta);
        }, { passive: false });

        // View Tools & 3D Perspective Mode
        if (elements.toggle3DViewBtn) {
            elements.toggle3DViewBtn.addEventListener('click', () => {
                state.is3DView = !state.is3DView;
                elements.toggle3DViewBtn.classList.toggle('active', state.is3DView);
                triggerUpdate(true);
            });
        }

        // Shape Radio Cards
        bindRadioGroup('featherShape', (val) => { state.featherShape = val; triggerUpdate(true); });
        bindRadioGroup('woodType', (val) => { 
            state.woodType = val; 
            if (val === 'carbon') {
                triggerCarbonGhost5s();
            } else {
                hideCarbonGhost();
            }
            triggerUpdate(true); 
        });

        // Click directly on Carbon Fiber label to activate/restart 5s ghost
        const carbonRadio = document.querySelector('input[name="woodType"][value="carbon"]');
        if (carbonRadio) {
            carbonRadio.closest('label').addEventListener('click', () => {
                triggerCarbonGhost5s();
            });
        }

        bindRadioGroup('pointType', (val) => { state.pointType = val; triggerUpdate(true); });
        bindRadioGroup('nockType', (val) => { state.nockType = val; triggerUpdate(true); });

        // Range Sliders (Inches & Dimensions)
        bindRangeInput(elements.featherLength, elements.featherLengthVal, '"', (v) => state.featherLength = parseFloat(v));
        bindRangeInput(elements.featherHeight, elements.featherHeightVal, '%', (v) => state.featherHeight = parseInt(v));
        bindRangeInput(elements.shaftDiameter, elements.shaftDiameterVal, ' mm', (v) => state.shaftDiameter = parseFloat(v));
        bindRangeInput(elements.crownLength, elements.crownLengthVal, '"', (v) => state.crownLength = parseFloat(v));
        bindRangeInput(elements.crestingStartOffset, elements.crestingStartOffsetVal, '"', (v) => state.crestingStartOffset = parseFloat(v));
        bindRangeInput(elements.arrowLength, elements.arrowLengthVal, '"', (v) => state.arrowLength = parseFloat(v));
        bindRangeInput(elements.drawWeight, elements.drawWeightVal, ' lbs', (v) => state.drawWeight = parseInt(v));
        bindRangeInput(elements.pointWeight, elements.pointWeightVal, ' gr', (v) => state.pointWeight = parseInt(v));

        // Color Inputs
        bindColorInput(elements.feather1Color, elements.feather1Hex, (c) => state.feather1Color = c);
        bindColorInput(elements.feather2Color, elements.feather2Hex, (c) => state.feather2Color = c);
        bindColorInput(elements.feather3Color, elements.feather3Hex, (c) => state.feather3Color = c);
        bindColorInput(elements.servingColor, elements.servingHex, (c) => state.servingColor = c);
        bindColorInput(elements.shaftBackColor, elements.shaftBackHex, (c) => state.shaftBackColor = c);
        bindColorInput(elements.shaftFrontColor, elements.shaftFrontHex, (c) => state.shaftFrontColor = c);
        bindColorInput(elements.crownDipColor, elements.crownDipHex, (c) => state.crownDipColor = c);
        bindColorInput(elements.pointColor, elements.pointHex, (c) => state.pointColor = c);
        bindColorInput(elements.nockColor, elements.nockHex, (c) => state.nockColor = c);

        // Copy Color Buttons
        elements.copyF1toF2.addEventListener('click', () => {
            state.feather2Color = state.feather1Color;
            updateUIFromState();
            triggerUpdate(true);
        });
        elements.copyF2toF3.addEventListener('click', () => {
            state.feather3Color = state.feather2Color;
            updateUIFromState();
            triggerUpdate(true);
        });

        // Checkbox Toggles
        if (elements.enableBarredFeathers) bindCheckbox(elements.enableBarredFeathers, (v) => state.enableBarredFeathers = v);
        bindCheckbox(elements.showFrontServing, (v) => state.showFrontServing = v);
        bindCheckbox(elements.showBackServing, (v) => state.showBackServing = v);
        if (elements.enableSpiralWrap) {
            bindCheckbox(elements.enableSpiralWrap, (v) => {
                state.enableSpiralWrap = v;
                elements.spiralWrapControls.style.display = v ? 'block' : 'none';
                triggerUpdate(true);
            });
        }
        if (elements.spiralWrapColor) {
            bindColorInput(elements.spiralWrapColor, elements.spiralWrapHex, (v) => state.spiralWrapColor = v);
        }

        bindCheckbox(elements.enableShaftStain, (v) => {
            state.enableShaftStain = v;
            elements.shaftStainControlsContainer.style.display = v ? 'block' : 'none';
            triggerUpdate(true);
        });

        bindCheckbox(elements.useSingleShaftColor, (v) => {
            state.useSingleShaftColor = v;
            elements.shaftFrontColorBox.style.display = v ? 'none' : 'block';
            triggerUpdate(true);
        });
        bindCheckbox(elements.enableCrownDip, (v) => {
            state.enableCrownDip = v;
            elements.crownDipControls.style.display = v ? 'block' : 'none';
            triggerUpdate(true);
        });

        // Cresting Controls & Add Band Action
        bindCheckbox(elements.showCresting, (v) => {
            state.showCresting = v;
            elements.crestingControlsContainer.style.display = v ? 'block' : 'none';
            triggerUpdate(true);
        });

        elements.addCrestingBandBtn.addEventListener('click', addCrestingBand);

        // Header Actions
        elements.undoBtn.addEventListener('click', undo);
        elements.redoBtn.addEventListener('click', redo);
        elements.smartRandomBtn.addEventListener('click', generateSmartRandom);

        // Export Menu Toggle & Actions
        elements.exportBtn.addEventListener('click', () => {
            elements.exportMenu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!elements.exportBtn.contains(e.target) && !elements.exportMenu.contains(e.target)) {
                elements.exportMenu.classList.remove('show');
            }
        });

        elements.exportPngBtn.addEventListener('click', exportPNG);
        elements.exportSvgBtn.addEventListener('click', exportSVG);
        elements.copySpecsBtn.addEventListener('click', copySpecsSummary);

        // Presets Chips
        elements.presetChipsContainer.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                elements.presetChipsContainer.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');

                const key = e.currentTarget.dataset.preset;
                if (builtInPresets[key]) {
                    Object.assign(state, builtInPresets[key]);
                    updateUIFromState();
                    triggerUpdate();
                }
            });
        });

        // User Custom Presets
        elements.saveCustomPresetBtn.addEventListener('click', saveCustomPreset);
        elements.userPresetsSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if (!name) return;
            const userPresets = JSON.parse(localStorage.getItem('arrowDesigner_userPresets') || localStorage.getItem('arrowStudio_userPresets') || '{}');
            if (userPresets[name]) {
                Object.assign(state, userPresets[name]);
                updateUIFromState();
                triggerUpdate();
            }
        });
        elements.deleteUserPresetBtn.addEventListener('click', deleteCustomPreset);

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        });
    }

    // Helper Binding Functions
    function bindRadioGroup(name, callback) {
        document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.closest('label').classList.remove('active'));
                e.target.closest('label').classList.add('active');
                callback(e.target.value);
            });
        });
    }

    function bindRangeInput(inputElem, labelElem, suffix, callback) {
        if (!inputElem) return;
        inputElem.addEventListener('input', (e) => {
            const val = e.target.value;
            labelElem.textContent = val + suffix;
            callback(val);
            triggerUpdate(false);
        });
    }

    function bindColorInput(inputElem, hexElem, callback) {
        if (!inputElem) return;
        inputElem.addEventListener('input', (e) => {
            const val = e.target.value;
            hexElem.textContent = val.toUpperCase();
            callback(val);
            triggerUpdate(false);
        });
    }

    function bindCheckbox(inputElem, callback) {
        if (!inputElem) return;
        inputElem.addEventListener('change', (e) => {
            callback(e.target.checked);
            triggerUpdate(true);
        });
    }

    let historyDebounceTimer = null;

    function triggerUpdate(immediate = false) {
        renderArrow();
        if (immediate) {
            if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
            saveStateToHistory();
        } else {
            if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
            historyDebounceTimer = setTimeout(() => {
                saveStateToHistory();
            }, 350);
        }
    }

    // ----------------------------------------------------------------------
    // UI Update Sync
    // ----------------------------------------------------------------------
    function updateUIFromState() {
        ['featherShape', 'woodType', 'pointType', 'nockType'].forEach(key => {
            const radio = document.querySelector(`input[name="${key}"][value="${state[key]}"]`);
            if (radio) {
                document.querySelectorAll(`input[name="${key}"]`).forEach(r => r.closest('label').classList.remove('active'));
                radio.checked = true;
                radio.closest('label').classList.add('active');
            }
        });

        // Stage Bg Button Sync
        document.querySelectorAll('.bg-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.bg === state.stageBg);
        });
        elements.stageContainer.className = `stage-container bg-${state.stageBg}`;

        elements.featherLength.value = state.featherLength; elements.featherLengthVal.textContent = state.featherLength + '"';
        elements.featherHeight.value = state.featherHeight; elements.featherHeightVal.textContent = state.featherHeight + '%';
        if (elements.shaftDiameter) { elements.shaftDiameter.value = state.shaftDiameter || 8.0; elements.shaftDiameterVal.textContent = (state.shaftDiameter || 8.0) + ' mm'; }
        elements.crownLength.value = state.crownLength; elements.crownLengthVal.textContent = state.crownLength + '"';
        elements.crestingStartOffset.value = state.crestingStartOffset || 0.30; elements.crestingStartOffsetVal.textContent = (state.crestingStartOffset || 0.30) + '"';
        elements.arrowLength.value = state.arrowLength; elements.arrowLengthVal.textContent = state.arrowLength + '"';
        elements.drawWeight.value = state.drawWeight; elements.drawWeightVal.textContent = state.drawWeight + ' lbs';
        elements.pointWeight.value = state.pointWeight; elements.pointWeightVal.textContent = state.pointWeight + ' gr';

        if (elements.enableBarredFeathers) elements.enableBarredFeathers.checked = !!state.enableBarredFeathers;

        elements.feather1Color.value = state.feather1Color; elements.feather1Hex.textContent = state.feather1Color.toUpperCase();
        elements.feather2Color.value = state.feather2Color; elements.feather2Hex.textContent = state.feather2Color.toUpperCase();
        elements.feather3Color.value = state.feather3Color; elements.feather3Hex.textContent = state.feather3Color.toUpperCase();
        elements.servingColor.value = state.servingColor; elements.servingHex.textContent = state.servingColor.toUpperCase();
        elements.shaftBackColor.value = state.shaftBackColor; elements.shaftBackHex.textContent = state.shaftBackColor.toUpperCase();
        elements.shaftFrontColor.value = state.shaftFrontColor; elements.shaftFrontHex.textContent = state.shaftFrontColor.toUpperCase();
        elements.crownDipColor.value = state.crownDipColor; elements.crownDipHex.textContent = state.crownDipColor.toUpperCase();
        elements.pointColor.value = state.pointColor; elements.pointHex.textContent = state.pointColor.toUpperCase();
        elements.nockColor.value = state.nockColor; elements.nockHex.textContent = state.nockColor.toUpperCase();

        elements.showFrontServing.checked = state.showFrontServing;
        elements.showBackServing.checked = state.showBackServing;
        if (elements.enableSpiralWrap) {
            elements.enableSpiralWrap.checked = !!state.enableSpiralWrap;
            elements.spiralWrapControls.style.display = state.enableSpiralWrap ? 'block' : 'none';
        }
        if (elements.spiralWrapColor) {
            elements.spiralWrapColor.value = state.spiralWrapColor || '#FEF08A';
            elements.spiralWrapHex.textContent = (state.spiralWrapColor || '#FEF08A').toUpperCase();
        }

        elements.enableShaftStain.checked = state.enableShaftStain;
        elements.shaftStainControlsContainer.style.display = state.enableShaftStain ? 'block' : 'none';

        elements.useSingleShaftColor.checked = state.useSingleShaftColor;
        elements.shaftFrontColorBox.style.display = state.useSingleShaftColor ? 'none' : 'block';

        elements.enableCrownDip.checked = state.enableCrownDip;
        elements.crownDipControls.style.display = state.enableCrownDip ? 'block' : 'none';

        elements.showCresting.checked = state.showCresting;
        elements.crestingControlsContainer.style.display = state.showCresting ? 'block' : 'none';

        // Render Dynamic Cresting Bands Cards
        renderCrestingBandsUI();
    }

    // ----------------------------------------------------------------------
    // Smart Randomizer
    // ----------------------------------------------------------------------
    function generateSmartRandom() {
        const woodColors = ['#D97706', '#B45309', '#92400E', '#78350F', '#451A03', '#65A30D', '#334155'];
        const dipColors = ['#F8FAFC', '#FEF08A', '#EF4444', '#3B82F6', '#10B981', '#1E293B', '#F59E0B', '#9333EA'];
        const nockColors = ['#B45309', '#78350F', '#1E293B', '#EF4444', '#F8FAFC', '#3B82F6'];
        const pointColors = ['#94A3B8', '#CBD5E1', '#64748B', '#F59E0B', '#334155'];
        
        const palettes = [
            { f1: '#EF4444', f2: '#1E293B', f3: '#1E293B', c1: '#EF4444', c2: '#F8FAFC', c3: '#1E293B' },
            { f1: '#F59E0B', f2: '#D97706', f3: '#D97706', c1: '#F59E0B', c2: '#FEF08A', c3: '#78350F' },
            { f1: '#10B981', f2: '#065F46', f3: '#065F46', c1: '#10B981', c2: '#ECFDF5', c3: '#065F46' },
            { f1: '#3B82F6', f2: '#1E3A8A', f3: '#1E3A8A', c1: '#3B82F6', c2: '#DBEAFE', c3: '#1E3A8A' },
            { f1: '#F8FAFC', f2: '#DC2626', f3: '#DC2626', c1: '#DC2626', c2: '#F8FAFC', c3: '#DC2626' }
        ];

        const shapes = ['shield', 'banana', 'parabolic', 'batman', 'traditional'];
        const woods = ['cedar', 'spruce', 'pine', 'bamboo', 'douglas', 'carbon'];
        const points = ['field', 'bullet', 'broadhead2', 'broadhead3', 'bodkin', 'blunt'];
        const nocks = ['plastic', 'selfnock', 'horn'];

        const pal = palettes[Math.floor(Math.random() * palettes.length)];
        state.featherShape = shapes[Math.floor(Math.random() * shapes.length)];
        state.woodType = woods[Math.floor(Math.random() * woods.length)];
        state.pointType = points[Math.floor(Math.random() * points.length)];
        state.nockType = nocks[Math.floor(Math.random() * nocks.length)];

        // Randomize Shaft colors, Stain & Crown Dip
        state.enableShaftStain = Math.random() > 0.5;
        state.shaftBackColor = woodColors[Math.floor(Math.random() * woodColors.length)];
        state.shaftFrontColor = woodColors[Math.floor(Math.random() * woodColors.length)];
        state.crownDipColor = dipColors[Math.floor(Math.random() * dipColors.length)];
        state.crownLength = parseFloat((Math.random() * 5.0 + 3.0).toFixed(2));
        state.enableCrownDip = Math.random() > 0.4;
        state.useSingleShaftColor = Math.random() > 0.4;

        state.nockColor = nockColors[Math.floor(Math.random() * nockColors.length)];
        state.pointColor = pointColors[Math.floor(Math.random() * pointColors.length)];
        state.servingColor = nockColors[Math.floor(Math.random() * nockColors.length)];

        state.feather1Color = pal.f1;
        state.feather2Color = pal.f2;
        state.feather3Color = pal.f3;

        // Randomize global offset & cresting bands count
        state.crestingStartOffset = parseFloat((Math.random() * 0.8 + 0.1).toFixed(2));
        const bandCount = Math.floor(Math.random() * 4) + 2; // 2 to 5 bands
        state.crestingBands = [];
        for (let b = 0; b < bandCount; b++) {
            state.crestingBands.push({
                id: 'rnd_' + b,
                color: b % 2 === 0 ? pal.c1 : pal.c2,
                width: parseFloat((Math.random() * 0.4 + 0.1).toFixed(2)),
                offset: parseFloat((Math.random() * 0.2 + 0.05).toFixed(2))
            });
        }

        updateUIFromState();
        triggerUpdate();
    }

    // ----------------------------------------------------------------------
    // History (Undo/Redo)
    // ----------------------------------------------------------------------
    function saveStateToHistory(isInit = false) {
        if (isApplyingHistory) return;

        const copy = JSON.parse(JSON.stringify(state));
        history = history.slice(0, historyIndex + 1);
        history.push(copy);

        if (history.length > MAX_HISTORY) history.shift();
        else historyIndex++;

        updateUndoRedoButtons();
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            isApplyingHistory = true;
            state = JSON.parse(JSON.stringify(history[historyIndex]));
            updateUIFromState();
            renderArrow();
            isApplyingHistory = false;
            updateUndoRedoButtons();
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            isApplyingHistory = true;
            state = JSON.parse(JSON.stringify(history[historyIndex]));
            updateUIFromState();
            renderArrow();
            isApplyingHistory = false;
            updateUndoRedoButtons();
        }
    }

    function updateUndoRedoButtons() {
        elements.undoBtn.disabled = historyIndex <= 0;
        elements.redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // ----------------------------------------------------------------------
    // User Presets LocalStorage
    // ----------------------------------------------------------------------
    function saveCustomPreset() {
        const name = elements.presetNameInput.value.trim();
        if (!name) {
            alert('Please enter a name for your custom preset!');
            return;
        }

        const userPresets = JSON.parse(localStorage.getItem('arrowDesigner_userPresets') || localStorage.getItem('arrowStudio_userPresets') || '{}');
        userPresets[name] = JSON.parse(JSON.stringify(state));
        localStorage.setItem('arrowDesigner_userPresets', JSON.stringify(userPresets));

        elements.presetNameInput.value = '';
        loadUserPresetsFromStorage();
        elements.userPresetsSelect.value = name;
        alert(`Preset "${name}" saved successfully!`);
    }

    function loadUserPresetsFromStorage() {
        const userPresets = JSON.parse(localStorage.getItem('arrowDesigner_userPresets') || localStorage.getItem('arrowStudio_userPresets') || '{}');
        elements.userPresetsSelect.innerHTML = '<option value="">-- My Saved Presets --</option>';

        for (let name in userPresets) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            elements.userPresetsSelect.appendChild(opt);
        }
    }

    function deleteCustomPreset() {
        const name = elements.userPresetsSelect.value;
        if (!name) return;

        if (confirm(`Are you sure you want to delete preset "${name}"?`)) {
            const userPresets = JSON.parse(localStorage.getItem('arrowDesigner_userPresets') || localStorage.getItem('arrowStudio_userPresets') || '{}');
            delete userPresets[name];
            localStorage.setItem('arrowDesigner_userPresets', JSON.stringify(userPresets));
            loadUserPresetsFromStorage();
        }
    }

    // ----------------------------------------------------------------------
    // Export Functions (PNG, SVG, Clipboard)
    // ----------------------------------------------------------------------
    function exportSVG() {
        const svgData = new XMLSerializer().serializeToString(elements.svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `arrow_${state.featherShape}_${state.woodType}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    function exportPNG() {
        const svgData = new XMLSerializer().serializeToString(elements.svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const URLObj = window.URL || window.webkitURL || window;
        const blobURL = URLObj.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1900;
            canvas.height = 480;
            const context = canvas.getContext('2d');

            context.fillStyle = state.stageBg === 'wood' ? '#150c07' : (state.stageBg === 'light' ? '#f1f5f9' : (state.stageBg === 'paper' ? '#fcf8ee' : '#090d16'));
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const png = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = png;
            downloadLink.download = `arrow_${state.featherShape}_${state.woodType}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        image.src = blobURL;
    }

    function copySpecsSummary() {
        const text = `🏹 ARROW SPECIFICATION:
• Fletching Shape: ${state.featherShape.toUpperCase()} (${state.featherLength}") [Spiral Binding: ${state.enableSpiralWrap ? 'YES' : 'NO'}]
• Shaft Material: ${state.woodType.toUpperCase()} (Diameter: ${state.shaftDiameter || 8.0}mm) (Stain: ${state.enableShaftStain ? 'YES' : 'NO'})
• Crown Dip Length: ${state.enableCrownDip ? state.crownLength + '"' : 'NONE'}
• Cresting Offset: ${state.showCresting ? state.crestingStartOffset + '"' : 'NONE'}
• Point Type: ${state.pointType.toUpperCase()} (${state.pointWeight} gr)
• Nock Type: ${state.nockType.toUpperCase()}
• Arrow Length: ${state.arrowLength}"`;

        navigator.clipboard.writeText(text).then(() => {
            alert('Arrow specification copied to clipboard!');
        });
    }

    // Run Initialization on Load
    document.addEventListener('DOMContentLoaded', init);
})();
