import { CSVLoader } from './data/CSVParser.js';
import { BVHLoader } from './data/BVHParser.js';
import { ConversionValidator } from './data/ConversionValidator.js';
import { Renderer } from './webgl/Renderer.js';
import { CameraController } from './controls/CameraController.js';
import { Scene } from './scene/Scene.js';
import { AnimationPlayer } from './animation/AnimationPlayer.js';
import { CatSkeletonDefinition } from './animation/CatSkeleton.js';
import { vec3 } from './math/vec3.js';

class CompareApp {
    constructor() {
        this.csvLoader = new CSVLoader();
        this.bvhLoader = new BVHLoader();
        this.validator = new ConversionValidator();
        
        this.csvData = null;
        this.bvhData = null;
        this.csvFileName = '';
        this.bvhFileName = '';
        
        this.csvPlayer = new AnimationPlayer();
        this.bvhPlayer = new AnimationPlayer();
        this.syncPlayback = true;
        
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        
        this.showCSV = true;
        this.showBVH = true;
        this.showDifference = true;
        this.diffLineWidth = 2;
        this.errorThreshold = 0.001;
        
        this.comparisonResult = null;
        this.isDraggingTimeline = false;
        
        this._initElements();
        this._initGL();
        this._setupEventListeners();
        this._startAnimationLoop();
    }

    _initElements() {
        this.elements = {
            loadCSVBtn: document.getElementById('loadCSVBtn'),
            loadBVHBtn: document.getElementById('loadBVHBtn'),
            csvFileInput: document.getElementById('csvFileInput'),
            bvhFileInput: document.getElementById('bvhFileInput'),
            csvFileName: document.getElementById('csvFileName'),
            bvhFileName: document.getElementById('bvhFileName'),
            showCSV: document.getElementById('showCSV'),
            showBVH: document.getElementById('showBVH'),
            showDifference: document.getElementById('showDifference'),
            showGrid: document.getElementById('showGrid'),
            showLabels: document.getElementById('showLabels'),
            diffLineWidth: document.getElementById('diffLineWidth'),
            diffLineWidthValue: document.getElementById('diffLineWidthValue'),
            errorThreshold: document.getElementById('errorThreshold'),
            errorThresholdValue: document.getElementById('errorThresholdValue'),
            resetViewBtn: document.getElementById('resetViewBtn'),
            frontViewBtn: document.getElementById('frontViewBtn'),
            sideViewBtn: document.getElementById('sideViewBtn'),
            topViewBtn: document.getElementById('topViewBtn'),
            syncPlayback: document.getElementById('syncPlayback'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevFrameBtn: document.getElementById('prevFrameBtn'),
            nextFrameBtn: document.getElementById('nextFrameBtn'),
            speedSelect: document.getElementById('speedSelect'),
            exportReportBtn: document.getElementById('exportReportBtn'),
            currentFrame: document.getElementById('currentFrame'),
            totalFrames: document.getElementById('totalFrames'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            timelineTrack: document.getElementById('timelineTrack'),
            timelineProgress: document.getElementById('timelineProgress'),
            timelineHandle: document.getElementById('timelineHandle'),
            errorDisplay: document.getElementById('errorDisplay'),
            currentFrameNum: document.getElementById('currentFrameNum'),
            currentMaxError: document.getElementById('currentMaxError'),
            currentAvgError: document.getElementById('currentAvgError'),
            currentMaxJoint: document.getElementById('currentMaxJoint'),
            overThresholdCount: document.getElementById('overThresholdCount'),
            statsInfo: document.getElementById('statsInfo'),
            compareCanvas: document.getElementById('compareCanvas')
        };
    }

    _initGL() {
        try {
            this.renderer = new Renderer(this.elements.compareCanvas, {
                backgroundColor: [0.03, 0.05, 0.1, 1]
            });
            this.camera = new CameraController(this.renderer, this.elements.compareCanvas);
            this.scene = new Scene(this.renderer, 1);
        } catch (error) {
            console.error('Failed to initialize WebGL:', error);
            alert('您的浏览器不支持WebGL 2.0，请使用现代浏览器访问。');
        }
    }

    _setupEventListeners() {
        this.elements.loadCSVBtn.addEventListener('click', () => this.elements.csvFileInput.click());
        this.elements.csvFileInput.addEventListener('change', (e) => this._loadCSV(e.target.files[0]));
        
        this.elements.loadBVHBtn.addEventListener('click', () => this.elements.bvhFileInput.click());
        this.elements.bvhFileInput.addEventListener('change', (e) => this._loadBVH(e.target.files[0]));
        
        this.elements.showCSV.addEventListener('change', (e) => {
            this.showCSV = e.target.checked;
        });
        this.elements.showBVH.addEventListener('change', (e) => {
            this.showBVH = e.target.checked;
        });
        this.elements.showDifference.addEventListener('change', (e) => {
            this.showDifference = e.target.checked;
        });
        this.elements.showGrid.addEventListener('change', (e) => {
            this.scene.setDisplayOption('showGrid', e.target.checked);
        });
        this.elements.showLabels.addEventListener('change', (e) => {
            this.scene.setDisplayOption('showLabels', e.target.checked);
        });
        
        this.elements.diffLineWidth.addEventListener('input', (e) => {
            this.diffLineWidth = parseInt(e.target.value);
            this.elements.diffLineWidthValue.textContent = this.diffLineWidth;
        });
        
        this.elements.errorThreshold.addEventListener('input', (e) => {
            this.errorThreshold = parseFloat(e.target.value) / 1000;
            this.elements.errorThresholdValue.textContent = e.target.value;
        });
        
        this.elements.resetViewBtn.addEventListener('click', () => this.camera.reset());
        this.elements.frontViewBtn.addEventListener('click', () => this.camera.setFrontView());
        this.elements.sideViewBtn.addEventListener('click', () => this.camera.setSideView());
        this.elements.topViewBtn.addEventListener('click', () => this.camera.setTopView());
        
        this.elements.syncPlayback.addEventListener('change', (e) => {
            this.syncPlayback = e.target.checked;
        });
        
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevFrameBtn.addEventListener('click', () => this.prevFrame());
        this.elements.nextFrameBtn.addEventListener('click', () => this.nextFrame());
        this.elements.speedSelect.addEventListener('change', (e) => this.setPlaybackSpeed(parseFloat(e.target.value)));
        this.elements.exportReportBtn.addEventListener('click', () => this.exportReport());
        
        this._setupTimelineEvents();
        
        this.csvPlayer.onPlay = () => this.elements.playPauseBtn.textContent = '⏸';
        this.csvPlayer.onPause = () => this.elements.playPauseBtn.textContent = '▶';
        this.csvPlayer.onFrameChange = (frame, pose, time) => {
            this._updateFrameDisplay(frame, time);
            this._updateTimeline();
            if (this.syncPlayback && this.bvhPlayer.isReady()) {
                const progress = this.csvPlayer.getNormalizedProgress();
                this.bvhPlayer.goToNormalizedTime(progress);
            }
        };
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
            this.csvPlayer.pause();
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

    async _loadCSV(file) {
        if (!file) return;
        
        try {
            this.csvData = await this.csvLoader.loadFromFile(file);
            this.csvFileName = file.name;
            this.csvPlayer.setAnimationData(this.csvData);
            this.elements.csvFileName.textContent = file.name;
            this.elements.csvFileName.classList.add('loaded');
            
            this._updateStats();
            this._updateFrameDisplay(0, 0);
            this.elements.totalFrames.textContent = this.csvData.frameCount;
            this.elements.totalTime.textContent = (this.csvData.frameCount / this.csvData.frameRate).toFixed(2) + 's';
            
            if (this.bvhData) {
                this._runComparison();
            }
        } catch (error) {
            console.error('Error loading CSV:', error);
            alert(`加载CSV失败: ${error.message}`);
        }
    }

    async _loadBVH(file) {
        if (!file) return;
        
        try {
            const result = await this.bvhLoader.loadFromFile(file, {
                targetUpAxis: 'z-up',
                targetUnit: 'meters',
                rotationOrder: 'ZXY',
                mappingType: 'motionBuilder'
            });
            this.bvhData = result.animationData;
            this.bvhFileName = file.name;
            this.bvhPlayer.setAnimationData(this.bvhData);
            this.elements.bvhFileName.textContent = file.name;
            this.elements.bvhFileName.classList.add('loaded');
            
            this._updateStats();
            
            if (this.csvData) {
                this._runComparison();
            }
        } catch (error) {
            console.error('Error loading BVH:', error);
            alert(`加载BVH失败: ${error.message}`);
        }
    }

    _runComparison() {
        if (!this.csvData || !this.bvhData) return;
        
        this.comparisonResult = this.validator.compareDatasets(this.csvData, this.bvhData);
        this.elements.errorDisplay.style.display = 'block';
        this._updateStats();
        
        const minFrames = Math.min(this.csvData.frameCount, this.bvhData.frameCount);
        this.elements.totalFrames.textContent = minFrames;
        const minFrameRate = Math.min(this.csvData.frameRate, this.bvhData.frameRate);
        this.elements.totalTime.textContent = (minFrames / minFrameRate).toFixed(2) + 's';
    }

    _updateStats() {
        let html = '';
        
        if (this.csvData) {
            html += `<div class="info-row"><span class="info-label">CSV帧数:</span><span class="info-value">${this.csvData.frameCount}</span></div>`;
            html += `<div class="info-row"><span class="info-label">CSV帧率:</span><span class="info-value">${this.csvData.frameRate} FPS</span></div>`;
        }
        if (this.bvhData) {
            html += `<div class="info-row"><span class="info-label">BVH帧数:</span><span class="info-value">${this.bvhData.frameCount}</span></div>`;
            html += `<div class="info-row"><span class="info-label">BVH帧率:</span><span class="info-value">${this.bvhData.frameRate} FPS</span></div>`;
        }
        
        if (this.comparisonResult) {
            html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;"></div>';
            html += `<div class="info-row"><span class="info-label">最大位置误差:</span><span class="info-value ${this.comparisonResult.maxPositionError > this.errorThreshold ? 'error' : 'success'}">${(this.comparisonResult.maxPositionError * 1000).toFixed(4)} mm</span></div>`;
            html += `<div class="info-row"><span class="info-label">平均位置误差:</span><span class="info-value">${(this.comparisonResult.averagePositionError * 1000).toFixed(4)} mm</span></div>`;
            html += `<div class="info-row"><span class="info-label">最大旋转误差:</span><span class="info-value">${(this.comparisonResult.maxRotationError * 180 / Math.PI).toFixed(4)}°</span></div>`;
        }
        
        this.elements.statsInfo.innerHTML = html || '<p>请加载两种格式的数据</p>';
    }

    _updateFrameDisplay(frame, time) {
        this.elements.currentFrame.textContent = frame;
        this.elements.currentTime.textContent = time.toFixed(2) + 's';
        this._updateErrorDisplay(frame);
    }

    _updateErrorDisplay(frame) {
        if (!this.comparisonResult || !this.comparisonResult.frameErrors[frame]) return;
        
        const frameError = this.comparisonResult.frameErrors[frame];
        this.elements.currentFrameNum.textContent = frame;
        
        const maxError = frameError.maxJointError;
        const avgError = frameError.jointErrors.reduce((sum, e) => sum + e.positionError, 0) / frameError.jointErrors.length;
        const overThreshold = frameError.jointErrors.filter(e => e.positionError > this.errorThreshold).length;
        
        this.elements.currentMaxError.textContent = (maxError * 1000).toFixed(4) + ' mm';
        this.elements.currentMaxError.className = 'error-value ' + (maxError > this.errorThreshold ? 'high' : 'low');
        
        this.elements.currentAvgError.textContent = (avgError * 1000).toFixed(4) + ' mm';
        this.elements.currentAvgError.className = 'error-value ' + (avgError > this.errorThreshold ? 'high' : 'low');
        
        this.elements.currentMaxJoint.textContent = frameError.maxJointName;
        this.elements.overThresholdCount.textContent = overThreshold;
    }

    _updateTimeline() {
        if (this.isDraggingTimeline) return;
        
        const progress = this.csvPlayer.getNormalizedProgress() * 100;
        this.elements.timelineProgress.style.width = progress + '%';
        this.elements.timelineHandle.style.left = progress + '%';
    }

    togglePlay() {
        this.csvPlayer.togglePlay();
        if (!this.syncPlayback) {
            this.bvhPlayer.togglePlay();
        }
    }

    prevFrame() {
        this.csvPlayer.previousFrame();
        if (this.syncPlayback) {
            this.bvhPlayer.previousFrame();
        }
    }

    nextFrame() {
        this.csvPlayer.nextFrame();
        if (this.syncPlayback) {
            this.bvhPlayer.nextFrame();
        }
    }

    setPlaybackSpeed(speed) {
        this.csvPlayer.setPlaybackSpeed(speed);
        this.bvhPlayer.setPlaybackSpeed(speed);
    }

    goToNormalizedTime(t) {
        this.csvPlayer.goToNormalizedTime(t);
        if (this.syncPlayback) {
            this.bvhPlayer.goToNormalizedTime(t);
        }
    }

    exportReport() {
        if (!this.comparisonResult) {
            alert('请先加载两种格式的数据进行对比');
            return;
        }
        
        const report = this._generateReport();
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'format_comparison_report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    _generateReport() {
        const lines = [];
        lines.push('=== CSV vs BVH 格式对比报告 ===');
        lines.push(`生成时间: ${new Date().toLocaleString()}`);
        lines.push('');
        lines.push(`CSV文件: ${this.csvFileName}`);
        lines.push(`BVH文件: ${this.bvhFileName}`);
        lines.push('');
        
        if (this.comparisonResult) {
            lines.push('--- 整体误差统计 ---');
            lines.push(`最大位置误差: ${(this.comparisonResult.maxPositionError * 1000).toFixed(6)} mm`);
            lines.push(`平均位置误差: ${(this.comparisonResult.averagePositionError * 1000).toFixed(6)} mm`);
            lines.push(`最大旋转误差: ${(this.comparisonResult.maxRotationError * 180 / Math.PI).toFixed(6)}°`);
            lines.push(`平均旋转误差: ${(this.comparisonResult.averageRotationError * 180 / Math.PI).toFixed(6)}°`);
            lines.push('');
            
            lines.push('--- 关节误差排名 (前10) ---');
            const jointsByError = Object.values(this.comparisonResult.jointErrors)
                .sort((a, b) => b.maxPosError - a.maxPosError)
                .slice(0, 10);
            
            for (const je of jointsByError) {
                lines.push(`${je.jointName.padEnd(25)} 最大: ${(je.maxPosError * 1000).toFixed(4)} mm  平均: ${(je.avgPosError * 1000).toFixed(4)} mm`);
            }
            lines.push('');
            
            lines.push('--- 帧误差最大的10帧 ---');
            const framesByError = [...this.comparisonResult.frameErrors]
                .sort((a, b) => b.maxJointError - a.maxJointError)
                .slice(0, 10);
            
            for (const fe of framesByError) {
                lines.push(`帧 ${fe.frame.toString().padStart(5)}: 最大误差 ${(fe.maxJointError * 1000).toFixed(4)} mm (${fe.maxJointName})`);
            }
        }
        
        return lines.join('\n');
    }

    _startAnimationLoop() {
        const animate = (timestamp) => {
            requestAnimationFrame(animate);
            
            this.csvPlayer.update(timestamp);
            if (!this.syncPlayback) {
                this.bvhPlayer.update(timestamp);
            }
            
            const deltaTime = 1 / 60;
            this.camera.update(deltaTime);
            
            this.renderer.beginFrame();
            
            if (this.showGrid) {
                this.scene.renderGrid();
            }
            
            const csvPose = this.csvPlayer.getCurrentPose();
            const bvhPose = this.bvhPlayer.getCurrentPose();
            
            if (this.showCSV && csvPose) {
                this.scene.setOverrideColor([0.29, 0.62, 1.0, 1.0]);
                this.scene.update(csvPose);
                this.scene.render(csvPose);
            }
            
            if (this.showBVH && bvhPose) {
                this.scene.setOverrideColor([1.0, 0.42, 0.42, 1.0]);
                this.scene.update(bvhPose);
                this.scene.render(bvhPose);
            }
            
            if (this.showDifference && csvPose && bvhPose) {
                this._renderDifference(csvPose, bvhPose);
            }
            
            this.scene.setOverrideColor(null);
        };
        
        requestAnimationFrame(animate);
    }

    _renderDifference(pose1, pose2) {
        const gl = this.renderer.gl;
        const jointCount = CatSkeletonDefinition.joints.length;
        
        const positions = [];
        const colors = [];
        
        for (let i = 0; i < jointCount; i++) {
            const pos1 = pose1.getPosition(i);
            const pos2 = pose2.getPosition(i);
            
            positions.push(pos1[0], pos1[1], pos1[2]);
            positions.push(pos2[0], pos2[1], pos2[2]);
            
            const error = vec3.distance(pos1, pos2);
            const errorRatio = Math.min(1, error / this.errorThreshold);
            
            const r = errorRatio;
            const g = 1 - errorRatio;
            const b = 0;
            
            colors.push(r, g, b, 1);
            colors.push(r, g, b, 1);
        }
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
        
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        
        const program = this.renderer._getProgram('diffLines');
        if (!program) {
            this._createDiffLineProgram();
            return;
        }
        
        gl.useProgram(program);
        gl.lineWidth(this.diffLineWidth);
        
        const positionLoc = gl.getAttribLocation(program, 'aPosition');
        const colorLoc = gl.getAttribLocation(program, 'aColor');
        const mvpLoc = gl.getUniformLocation(program, 'uMVP');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        
        const mvp = this.camera.getViewProjectionMatrix();
        gl.uniformMatrix4fv(mvpLoc, false, mvp);
        
        gl.drawArrays(gl.LINES, 0, jointCount * 2);
        
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(colorBuffer);
    }

    _createDiffLineProgram() {
        const gl = this.renderer.gl;
        
        const vsSource = `
            attribute vec3 aPosition;
            attribute vec4 aColor;
            uniform mat4 uMVP;
            varying vec4 vColor;
            void main() {
                gl_Position = uMVP * vec4(aPosition, 1.0);
                vColor = aColor;
                gl_PointSize = 5.0;
            }
        `;
        
        const fsSource = `
            precision mediump float;
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor;
            }
        `;
        
        const program = this.renderer._createProgram(vsSource, fsSource);
        if (program) {
            this.renderer._cacheProgram('diffLines', program);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new CompareApp();
});
