import { CSVLoader } from '../data/CSVParser.js';
import { AnimationPlayer } from '../animation/AnimationPlayer.js';
import { Renderer } from '../webgl/Renderer.js';
import { CameraController } from './CameraController.js';
import { Scene, ComparisonAnalyzer } from '../scene/Scene.js';
import { CatSkeletonDefinition, CatSkeletonPose } from '../animation/CatSkeleton.js';

export class App {
    constructor() {
        this.mode = 'single';
        this.isCompareMode = false;
        
        this.csvLoader = new CSVLoader();
        
        this.player1 = new AnimationPlayer();
        this.player2 = new AnimationPlayer();
        
        this.renderer1 = null;
        this.renderer2 = null;
        
        this.camera1 = null;
        this.camera2 = null;
        
        this.scene1 = null;
        this.scene2 = null;
        
        this.comparisonAnalyzer = null;
        
        this.syncPlayback = true;
        
        this.fpsCounter = {
            frames: 0,
            lastTime: performance.now(),
            currentFps: 0
        };
        
        this.isDraggingTimeline = false;
        this.animationFrameId = null;
        this.lastTimestamp = performance.now();
        
        this._initElements();
        this._initGL();
        this._initPlayers();
        this._setupEventListeners();
        this._populateDataSelectors();
        this._startAnimationLoop();
    }

    _initElements() {
        this.elements = {
            singleModeBtn: document.getElementById('singleModeBtn'),
            compareModeBtn: document.getElementById('compareModeBtn'),
            comparePanel: document.getElementById('comparePanel'),
            viewport1: document.getElementById('viewport1'),
            viewport2: document.getElementById('viewport2'),
            viewportContainer: document.getElementById('viewportContainer'),
            viewport1Title: document.getElementById('viewport1Title'),
            viewport2Title: document.getElementById('viewport2Title'),
            viewport1Info: document.getElementById('viewport1Info'),
            viewport2Info: document.getElementById('viewport2Info'),
            glCanvas1: document.getElementById('glCanvas1'),
            glCanvas2: document.getElementById('glCanvas2'),
            catSelect: document.getElementById('catSelect'),
            actionSelect: document.getElementById('actionSelect'),
            fileSelect: document.getElementById('fileSelect'),
            loadDataBtn: document.getElementById('loadDataBtn'),
            customFileBtn: document.getElementById('customFileBtn'),
            customFileInput: document.getElementById('customFileInput'),
            catSelect2: document.getElementById('catSelect2'),
            actionSelect2: document.getElementById('actionSelect2'),
            fileSelect2: document.getElementById('fileSelect2'),
            loadDataBtn2: document.getElementById('loadDataBtn2'),
            showSkeleton: document.getElementById('showSkeleton'),
            showJoints: document.getElementById('showJoints'),
            showTrajectory: document.getElementById('showTrajectory'),
            showGrid: document.getElementById('showGrid'),
            showLabels: document.getElementById('showLabels'),
            trajectoryOptions: document.getElementById('trajectoryOptions'),
            trailLength: document.getElementById('trailLength'),
            trailLengthValue: document.getElementById('trailLengthValue'),
            colorByLimb: document.getElementById('colorByLimb'),
            showFrontLegs: document.getElementById('showFrontLegs'),
            showBackLegs: document.getElementById('showBackLegs'),
            showTail: document.getElementById('showTail'),
            showHead: document.getElementById('showHead'),
            syncPlayback: document.getElementById('syncPlayback'),
            showDiff: document.getElementById('showDiff'),
            resetViewBtn: document.getElementById('resetViewBtn'),
            frontViewBtn: document.getElementById('frontViewBtn'),
            sideViewBtn: document.getElementById('sideViewBtn'),
            topViewBtn: document.getElementById('topViewBtn'),
            autoRotate: document.getElementById('autoRotate'),
            dataInfo: document.getElementById('dataInfo'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevFrameBtn: document.getElementById('prevFrameBtn'),
            nextFrameBtn: document.getElementById('nextFrameBtn'),
            speedSelect: document.getElementById('speedSelect'),
            currentFrame: document.getElementById('currentFrame'),
            totalFrames: document.getElementById('totalFrames'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            timelineTrack: document.getElementById('timelineTrack'),
            timelineProgress: document.getElementById('timelineProgress'),
            timelineHandle: document.getElementById('timelineHandle'),
            fpsDisplay: document.getElementById('fpsDisplay')
        };
    }

    _initGL() {
        try {
            this.renderer1 = new Renderer(this.elements.glCanvas1, {
                backgroundColor: [0.03, 0.05, 0.1, 1]
            });
            this.camera1 = new CameraController(this.renderer1, this.elements.glCanvas1);
            this.scene1 = new Scene(this.renderer1, 1);
            this.scene1.setOverrideColor([0.4, 0.8, 1, 1]);

            this.renderer2 = new Renderer(this.elements.glCanvas2, {
                backgroundColor: [0.03, 0.05, 0.1, 1]
            });
            this.camera2 = new CameraController(this.renderer2, this.elements.glCanvas2);
            this.scene2 = new Scene(this.renderer2, 2);
            this.scene2.setOverrideColor([1, 0.6, 0.4, 1]);

            this.comparisonAnalyzer = new ComparisonAnalyzer(this.scene1, this.scene2);
        } catch (error) {
            console.error('Failed to initialize WebGL:', error);
            alert('您的浏览器不支持WebGL 2.0，请使用现代浏览器访问。');
        }
    }

    _initPlayers() {
        this.player1.onFrameChange = (frame, pose, time) => {
            this._updateFrameDisplay(frame, time);
            this._updateTimeline();
            this.scene1.update(pose);
            if (this.syncPlayback && this.mode === 'compare' && this.player2.isReady()) {
                const progress = this.player1.getNormalizedProgress();
                this.player2.goToNormalizedTime(progress);
                this.scene2.update(this.player2.getCurrentPose());
            }
        };

        this.player1.onPlay = () => {
            this.elements.playPauseBtn.textContent = '⏸';
        };

        this.player1.onPause = () => {
            this.elements.playPauseBtn.textContent = '▶';
        };

        this.player2.onFrameChange = (frame, pose, time) => {
            this.scene2.update(pose);
        };
    }

    _setupEventListeners() {
        this.elements.singleModeBtn.addEventListener('click', () => this.setMode('single'));
        this.elements.compareModeBtn.addEventListener('click', () => this.setMode('compare'));

        this.elements.loadDataBtn.addEventListener('click', () => this.loadData(1));
        this.elements.loadDataBtn2.addEventListener('click', () => this.loadData(2));
        this.elements.customFileBtn.addEventListener('click', () => this.elements.customFileInput.click());
        this.elements.customFileInput.addEventListener('change', (e) => this.handleFileUpload(e, 1));

        this.elements.catSelect.addEventListener('change', () => this.updateFileList(1));
        this.elements.actionSelect.addEventListener('change', () => this.updateFileList(1));
        this.elements.catSelect2.addEventListener('change', () => this.updateFileList(2));
        this.elements.actionSelect2.addEventListener('change', () => this.updateFileList(2));

        this.elements.showSkeleton.addEventListener('change', (e) => this.setDisplayOption('showSkeleton', e.target.checked));
        this.elements.showJoints.addEventListener('change', (e) => this.setDisplayOption('showJoints', e.target.checked));
        this.elements.showTrajectory.addEventListener('change', (e) => this.toggleTrajectory(e.target.checked));
        this.elements.showGrid.addEventListener('change', (e) => this.setDisplayOption('showGrid', e.target.checked));
        this.elements.showLabels.addEventListener('change', (e) => this.setDisplayOption('showLabels', e.target.checked));

        this.elements.trailLength.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.trailLengthValue.textContent = value;
            this.setTrajectoryLength(value);
        });

        this.elements.colorByLimb.addEventListener('change', (e) => this.setColorByLimb(e.target.checked));
        this.elements.showFrontLegs.addEventListener('change', (e) => this.setLimbVisibility('frontLegs', e.target.checked));
        this.elements.showBackLegs.addEventListener('change', (e) => this.setLimbVisibility('backLegs', e.target.checked));
        this.elements.showTail.addEventListener('change', (e) => this.setLimbVisibility('tail', e.target.checked));
        this.elements.showHead.addEventListener('change', (e) => this.setLimbVisibility('head', e.target.checked));

        this.elements.syncPlayback.addEventListener('change', (e) => this.syncPlayback = e.target.checked);
        this.elements.showDiff.addEventListener('change', (e) => this.comparisonAnalyzer.setShowDifference(e.target.checked));

        this.elements.resetViewBtn.addEventListener('click', () => this.resetView());
        this.elements.frontViewBtn.addEventListener('click', () => this.setFrontView());
        this.elements.sideViewBtn.addEventListener('click', () => this.setSideView());
        this.elements.topViewBtn.addEventListener('click', () => this.setTopView());
        this.elements.autoRotate.addEventListener('change', (e) => this.setAutoRotate(e.target.checked));

        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevFrameBtn.addEventListener('click', () => this.prevFrame());
        this.elements.nextFrameBtn.addEventListener('click', () => this.nextFrame());
        this.elements.speedSelect.addEventListener('change', (e) => this.setPlaybackSpeed(parseFloat(e.target.value)));

        this._setupTimelineEvents();

        document.addEventListener('keydown', (e) => this._handleKeydown(e));
    }

    _setupTimelineEvents() {
        const track = this.elements.timelineTrack;
        const handle = this.elements.timelineHandle;

        const onTimelineClick = (e) => {
            const rect = track.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const progress = Math.max(0, Math.min(1, x / rect.width));
            this.goToNormalizedTime(progress);
        };

        const onDragStart = (e) => {
            e.preventDefault();
            this.isDraggingTimeline = true;
            this.player1.pause();
            onTimelineClick(e);
            
            document.addEventListener('mousemove', onTimelineClick);
            document.addEventListener('mouseup', onDragEnd);
        };

        const onDragEnd = () => {
            this.isDraggingTimeline = false;
            document.removeEventListener('mousemove', onTimelineClick);
            document.removeEventListener('mouseup', onDragEnd);
        };

        track.addEventListener('mousedown', onDragStart);
        handle.addEventListener('mousedown', onDragStart);
        track.addEventListener('click', onTimelineClick);
    }

    _handleKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.prevFrame();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextFrame();
                break;
            case 'KeyR':
                this.resetView();
                break;
        }
    }

    _populateDataSelectors() {
        const cats = ['猫咪_001', '猫咪_002', '猫咪_003', '猫咪_004', '猫咪_005'];
        const actions = ['行走', '奔跑', '跳跃', '打滚', '坐下', '站立', '玩耍', '睡觉'];
        
        const populateSelect = (select, options) => {
            select.innerHTML = '';
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                select.appendChild(option);
            });
        };

        populateSelect(this.elements.catSelect, cats);
        populateSelect(this.elements.catSelect2, cats);
        populateSelect(this.elements.actionSelect, actions);
        populateSelect(this.elements.actionSelect2, actions);

        this.updateFileList(1);
        this.updateFileList(2);
    }

    updateFileList(viewport) {
        const catSelect = viewport === 1 ? this.elements.catSelect : this.elements.catSelect2;
        const actionSelect = viewport === 1 ? this.elements.actionSelect : this.elements.actionSelect2;
        const fileSelect = viewport === 1 ? this.elements.fileSelect : this.elements.fileSelect2;

        const cat = catSelect.value;
        const action = actionSelect.value;

        const files = [
            `${cat}_${action}.csv`
        ];

        fileSelect.innerHTML = '';
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            fileSelect.appendChild(option);
        });
    }

    async loadData(viewport) {
        const fileSelect = viewport === 1 ? this.elements.fileSelect : this.elements.fileSelect2;
        const fileName = fileSelect.value;
        const catSelect = viewport === 1 ? this.elements.catSelect : this.elements.catSelect2;
        const actionSelect = viewport === 1 ? this.elements.actionSelect : this.elements.actionSelect2;

        this._showLoading(`正在加载 ${fileName}...`);

        try {
            let data;
            const filePath = `data/sample/${fileName}`;
            
            try {
                data = await this.csvLoader.loadFromURL(filePath, {
                    onProgress: (loaded, total) => {
                        if (total) {
                            this._updateLoadingProgress(loaded / total);
                        }
                    }
                });
            } catch (e) {
                console.warn(`加载CSV文件失败: ${filePath}, 错误: ${e.message}, 将使用模拟数据`);
                data = this._generateSampleData(catSelect.value, actionSelect.value);
            }

            const player = viewport === 1 ? this.player1 : this.player2;
            player.setAnimationData(data);

            if (viewport === 1) {
                this.elements.viewport1Title.textContent = `${catSelect.value} - ${actionSelect.value}`;
                this.scene1.clearTrajectories();
            } else {
                this.elements.viewport2Title.textContent = `${catSelect.value} - ${actionSelect.value}`;
                this.scene2.clearTrajectories();
            }

            this._updateDataInfo(data, viewport);
            this._updateFrameDisplay(0, 0);
            
            if (viewport === 1) {
                this.elements.totalFrames.textContent = data.frameCount;
                this.elements.totalTime.textContent = data.frameCount / data.frameRate + 's';
            }

        } catch (error) {
            console.error('Error loading data:', error);
            alert(`加载数据失败: ${error.message}`);
        } finally {
            this._hideLoading();
        }
    }

    async handleFileUpload(event, viewport) {
        const file = event.target.files[0];
        if (!file) return;

        this._showLoading(`正在加载 ${file.name}...`);

        try {
            const data = await this.csvLoader.loadFromFile(file, {
                onProgress: (loaded, total) => {
                    if (total) {
                        this._updateLoadingProgress(loaded / total);
                    }
                }
            });

            const player = viewport === 1 ? this.player1 : this.player2;
            player.setAnimationData(data);

            if (viewport === 1) {
                this.elements.viewport1Title.textContent = file.name;
                this.scene1.clearTrajectories();
            } else {
                this.elements.viewport2Title.textContent = file.name;
                this.scene2.clearTrajectories();
            }

            this._updateDataInfo(data, viewport);
            this._updateFrameDisplay(0, 0);
            
            if (viewport === 1) {
                this.elements.totalFrames.textContent = data.frameCount;
                this.elements.totalTime.textContent = data.frameCount / data.frameRate + 's';
            }

        } catch (error) {
            console.error('Error loading file:', error);
            alert(`加载文件失败: ${error.message}`);
        } finally {
            this._hideLoading();
        }

        event.target.value = '';
    }

    _generateSampleData(cat, action) {
        const frameCount = 240;
        const frameRate = 60;
        const data = {
            jointNames: [],
            frameCount,
            frameRate,
            metadata: { cat, action, source: 'generated' },
            frames: []
        };


        
        for (let i = 0; i < frameCount; i++) {
            const pose = new CatSkeletonPose();
            const t = i / frameCount;
            const phase = t * Math.PI * 2;
            
            for (let j = 0; j < CatSkeletonDefinition.joints.length; j++) {
                const joint = CatSkeletonDefinition.joints[j];
                const pos = [...joint.defaultPos];
                
                if (action === '行走' || action === '奔跑') {
                    const speed = action === '奔跑' ? 2 : 1;
                    const walkPhase = phase * speed;
                    
                    if (joint.name.includes('front_left')) {
                        pos[1] += Math.sin(walkPhase) * 0.1;
                        pos[2] += Math.cos(walkPhase) * 0.05;
                    } else if (joint.name.includes('front_right')) {
                        pos[1] += Math.sin(walkPhase + Math.PI) * 0.1;
                        pos[2] += Math.cos(walkPhase + Math.PI) * 0.05;
                    } else if (joint.name.includes('back_left')) {
                        pos[1] += Math.sin(walkPhase + Math.PI) * 0.12;
                        pos[2] += Math.cos(walkPhase + Math.PI) * 0.06;
                    } else if (joint.name.includes('back_right')) {
                        pos[1] += Math.sin(walkPhase) * 0.12;
                        pos[2] += Math.cos(walkPhase) * 0.06;
                    } else if (joint.name.includes('tail')) {
                        pos[0] += Math.sin(phase * 3) * 0.03;
                        pos[2] += Math.cos(phase * 2) * 0.02;
                    } else if (joint.name === 'head') {
                        pos[1] += Math.sin(phase * 2) * 0.02;
                    }
                    
                    const bodyMove = action === '奔跑' ? 0.08 : 0.03;
                    if (joint.limb === 'spine' || joint.limb === 'head') {
                        pos[1] += Math.sin(phase * speed * 2) * bodyMove;
                    }
                } else if (action === '跳跃') {
                    const jumpPhase = t < 0.5 ? t * 2 : 2 - t * 2;
                    const jumpHeight = Math.sin(jumpPhase * Math.PI) * 0.5;
                    
                    if (joint.limb === 'spine' || joint.limb === 'head') {
                        pos[1] += jumpHeight;
                    }
                    if (joint.name.includes('paw') || joint.name.includes('foot')) {
                        pos[1] += jumpHeight * 0.8;
                    }
                    if (joint.name.includes('tail')) {
                        pos[1] += Math.sin(phase * 4) * 0.1;
                    }
                } else if (action === '打滚') {
                    const rollPhase = phase * 2;
                    const rollOffset = Math.sin(rollPhase) * 0.3;
                    
                    if (joint.limb === 'spine' || joint.limb === 'head') {
                        pos[0] += rollOffset;
                        pos[1] = Math.max(0.1, pos[1] - Math.abs(rollOffset) * 0.5);
                    }
                    if (joint.name.includes('tail')) {
                        pos[0] += Math.sin(phase * 5) * 0.1;
                    }
                } else if (action === '玩耍') {
                    if (joint.name === 'head') {
                        pos[0] += Math.sin(phase * 4) * 0.08;
                        pos[1] += Math.cos(phase * 3) * 0.05;
                    }
                    if (joint.name.includes('paw')) {
                        pos[1] += Math.abs(Math.sin(phase * 6)) * 0.15;
                        pos[0] += Math.sin(phase * 4) * 0.1;
                    }
                    if (joint.name.includes('tail')) {
                        pos[0] += Math.sin(phase * 8) * 0.15;
                        pos[1] += Math.cos(phase * 6) * 0.05;
                    }
                }
                
                pose.setPosition(j, pos);
            }
            
            data.frames.push(pose);
        }

        return data;
    }

    _showLoading(text) {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text"></div>
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.querySelector('.loading-text').textContent = text;
        overlay.querySelector('.loading-progress-bar').style.width = '0%';
    }

    _updateLoadingProgress(progress) {
        const bar = document.querySelector('.loading-progress-bar');
        if (bar) {
            bar.style.width = Math.min(100, progress * 100) + '%';
        }
    }

    _hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    _updateDataInfo(data, viewport) {
        const info = this.elements.dataInfo;
        const metrics = viewport === 1 ? this.player1.calculateMotionMetrics() : this.player2.calculateMotionMetrics();
        
        let html = '';
        
        if (data.metadata.cat) {
            html += `<div class="info-row"><span class="info-label">猫咪编号:</span><span class="info-value">${data.metadata.cat}</span></div>`;
        }
        if (data.metadata.action) {
            html += `<div class="info-row"><span class="info-label">动作类型:</span><span class="info-value">${data.metadata.action}</span></div>`;
        }
        
        html += `<div class="info-row"><span class="info-label">帧数:</span><span class="info-value">${data.frameCount}</span></div>`;
        html += `<div class="info-row"><span class="info-label">帧率:</span><span class="info-value">${data.frameRate} FPS</span></div>`;
        html += `<div class="info-row"><span class="info-label">时长:</span><span class="info-value">${(data.frameCount / data.frameRate).toFixed(2)}s</span></div>`;
        html += `<div class="info-row"><span class="info-label">关节数:</span><span class="info-value">${data.jointNames.length || 30}</span></div>`;
        
        if (metrics) {
            html += `<div class="info-row"><span class="info-label">总移动距离:</span><span class="info-value">${metrics.totalDistance.toFixed(3)}m</span></div>`;
            html += `<div class="info-row"><span class="info-label">平均速度:</span><span class="info-value">${metrics.averageSpeed.toFixed(3)}m/s</span></div>`;
            html += `<div class="info-row"><span class="info-label">最大速度:</span><span class="info-value">${metrics.maxVelocity.toFixed(3)}m/s</span></div>`;
        }

        info.innerHTML = html;
    }

    _updateFrameDisplay(frame, time) {
        this.elements.currentFrame.textContent = frame;
        this.elements.currentTime.textContent = time.toFixed(2) + 's';
    }

    _updateTimeline() {
        if (this.isDraggingTimeline) return;
        
        const progress = this.player1.getNormalizedProgress() * 100;
        this.elements.timelineProgress.style.width = progress + '%';
        this.elements.timelineHandle.style.left = progress + '%';
    }

    setMode(mode) {
        this.mode = mode;
        this.isCompareMode = mode === 'compare';

        if (mode === 'compare') {
            this.elements.singleModeBtn.classList.remove('active');
            this.elements.compareModeBtn.classList.add('active');
            this.elements.viewport2.style.display = 'flex';
            this.elements.comparePanel.style.display = 'block';
            this.elements.viewport1.style.flex = '1';
            this.elements.viewport2.style.flex = '1';
        } else {
            this.elements.singleModeBtn.classList.add('active');
            this.elements.compareModeBtn.classList.remove('active');
            this.elements.viewport2.style.display = 'none';
            this.elements.comparePanel.style.display = 'none';
            this.elements.viewport1.style.flex = '1';
        }

        setTimeout(() => {
            this.renderer1.resize();
            if (this.renderer2) this.renderer2.resize();
        }, 100);
    }

    setDisplayOption(option, value) {
        this.scene1.setDisplayOption(option, value);
        this.scene2.setDisplayOption(option, value);
    }

    toggleTrajectory(show) {
        this.setDisplayOption('showTrajectory', show);
        this.elements.trajectoryOptions.style.display = show ? 'flex' : 'none';
    }

    setTrajectoryLength(length) {
        this.scene1.setTrajectoryLength(length);
        this.scene2.setTrajectoryLength(length);
    }

    setColorByLimb(enabled) {
        this.scene1.setColorByLimb(enabled);
        this.scene2.setColorByLimb(enabled);
    }

    setLimbVisibility(limb, visible) {
        this.scene1.setLimbVisibility(limb, visible);
        this.scene2.setLimbVisibility(limb, visible);
    }

    resetView() {
        this.camera1.reset();
        this.camera2.reset();
    }

    setFrontView() {
        this.camera1.setFrontView();
        this.camera2.setFrontView();
    }

    setSideView() {
        this.camera1.setSideView();
        this.camera2.setSideView();
    }

    setTopView() {
        this.camera1.setTopView();
        this.camera2.setTopView();
    }

    setAutoRotate(enabled) {
        this.camera1.setAutoRotate(enabled);
        this.camera2.setAutoRotate(enabled);
    }

    togglePlay() {
        this.player1.togglePlay();
        if (!this.syncPlayback && this.mode === 'compare') {
            this.player2.togglePlay();
        }
    }

    prevFrame() {
        this.player1.previousFrame();
        if (this.syncPlayback && this.mode === 'compare') {
            this.player2.previousFrame();
        }
    }

    nextFrame() {
        this.player1.nextFrame();
        if (this.syncPlayback && this.mode === 'compare') {
            this.player2.nextFrame();
        }
    }

    setPlaybackSpeed(speed) {
        this.player1.setPlaybackSpeed(speed);
        this.player2.setPlaybackSpeed(speed);
    }

    goToNormalizedTime(t) {
        this.player1.goToNormalizedTime(t);
        if (this.syncPlayback && this.mode === 'compare') {
            this.player2.goToNormalizedTime(t);
        }
    }

    _updateFPS(timestamp) {
        this.fpsCounter.frames++;
        const elapsed = timestamp - this.fpsCounter.lastTime;
        
        if (elapsed >= 1000) {
            this.fpsCounter.currentFps = Math.round(this.fpsCounter.frames * 1000 / elapsed);
            this.elements.fpsDisplay.textContent = this.fpsCounter.currentFps;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = timestamp;
        }
    }

    _startAnimationLoop() {
        const animate = (timestamp) => {
            this.animationFrameId = requestAnimationFrame(animate);
            
            const deltaTime = (timestamp - this.lastTimestamp) / 1000;
            this.lastTimestamp = timestamp;

            this.player1.update(timestamp);
            if (this.mode === 'compare' && !this.syncPlayback) {
                this.player2.update(timestamp);
            }

            this.camera1.update(deltaTime);
            this.camera2.update(deltaTime);

            this.renderer1.beginFrame();
            this.scene1.render(this.player1.getCurrentPose());
            if (this.mode === 'compare' && this.comparisonAnalyzer.showDifference) {
                this.comparisonAnalyzer.renderDifference(
                    this.player1.getCurrentPose(),
                    this.player2.getCurrentPose(),
                    this.renderer1
                );
            }

            if (this.mode === 'compare') {
                this.renderer2.beginFrame();
                this.scene2.render(this.player2.getCurrentPose());
            }

            this._updateFPS(timestamp);

            this.elements.viewport1Info.textContent = `帧 ${this.player1.getCurrentFrameIndex() + 1}`;
            if (this.mode === 'compare') {
                this.elements.viewport2Info.textContent = `帧 ${this.player2.getCurrentFrameIndex() + 1}`;
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.renderer1) this.renderer1.dispose();
        if (this.renderer2) this.renderer2.dispose();
        if (this.scene1) this.scene1.dispose();
        if (this.scene2) this.scene2.dispose();
    }
}
