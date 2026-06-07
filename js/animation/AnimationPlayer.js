import { CatSkeletonPose } from './CatSkeleton.js';

export class AnimationPlayer {
    constructor(animationData = null) {
        this.animationData = null;
        this.currentFrame = 0;
        this.currentTime = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        this.isLooping = true;
        this.isReversed = false;
        this.currentPose = new CatSkeletonPose();
        
        this.onFrameChange = null;
        this.onPlay = null;
        this.onPause = null;
        this.onComplete = null;
        
        this._lastTimestamp = 0;
        this._frameAccumulator = 0;

        if (animationData) {
            this.setAnimationData(animationData);
        }
    }

    setAnimationData(data) {
        this.animationData = data;
        this.currentFrame = 0;
        this.currentTime = 0;
        this._frameAccumulator = 0;
        this.isPlaying = false;
        
        if (data && data.frames && data.frames.length > 0) {
            this.currentPose.copyFrom(data.frames[0]);
        }
        
        this._notifyFrameChange();
    }

    getFrameCount() {
        return this.animationData?.frameCount || 0;
    }

    getFrameRate() {
        return this.animationData?.frameRate || 60;
    }

    getDuration() {
        if (!this.animationData) return 0;
        return this.animationData.frameCount / this.animationData.frameRate;
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getCurrentFrameIndex() {
        return this.currentFrame;
    }

    isReady() {
        return this.animationData && this.animationData.frames && this.animationData.frames.length > 0;
    }

    play() {
        if (!this.isReady() || this.isPlaying) return;
        
        this.isPlaying = true;
        this._lastTimestamp = performance.now();
        this._frameAccumulator = 0;
        
        if (this.onPlay) {
            this.onPlay();
        }
    }

    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        if (this.onPause) {
            this.onPause();
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    stop() {
        this.pause();
        this.goToFrame(0);
    }

    goToFrame(frameIndex) {
        if (!this.isReady()) return;
        
        const frames = this.animationData.frames;
        const totalFrames = frames.length;
        
        let newFrame = frameIndex;
        if (this.isLooping) {
            newFrame = ((newFrame % totalFrames) + totalFrames) % totalFrames;
        } else {
            newFrame = Math.max(0, Math.min(totalFrames - 1, newFrame));
        }
        
        this.currentFrame = newFrame;
        this.currentTime = newFrame / this.animationData.frameRate;
        this._frameAccumulator = 0;
        
        this.currentPose.copyFrom(frames[newFrame]);
        this._notifyFrameChange();
    }

    goToTime(time) {
        if (!this.isReady()) return;
        
        const frameIndex = Math.floor(time * this.animationData.frameRate);
        this.goToFrame(frameIndex);
    }

    goToNormalizedTime(t) {
        if (!this.isReady()) return;
        
        const frameIndex = Math.floor(t * (this.animationData.frames.length - 1));
        this.goToFrame(frameIndex);
    }

    nextFrame() {
        if (!this.isReady()) return;
        this.goToFrame(this.currentFrame + 1);
    }

    previousFrame() {
        if (!this.isReady()) return;
        this.goToFrame(this.currentFrame - 1);
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = Math.max(0.01, Math.min(32, speed));
    }

    setLooping(looping) {
        this.isLooping = looping;
    }

    setReversed(reversed) {
        this.isReversed = reversed;
    }

    update(timestamp) {
        if (!this.isPlaying || !this.isReady()) return;
        
        const deltaTime = (timestamp - this._lastTimestamp) / 1000;
        this._lastTimestamp = timestamp;
        
        const frameDuration = 1 / this.animationData.frameRate;
        const adjustedDelta = deltaTime * this.playbackSpeed * (this.isReversed ? -1 : 1);
        
        this._frameAccumulator += adjustedDelta;
        
        while (Math.abs(this._frameAccumulator) >= frameDuration) {
            const frameStep = this._frameAccumulator > 0 ? 1 : -1;
            
            this.currentFrame += frameStep;
            this._frameAccumulator -= frameStep * frameDuration;
            
            const totalFrames = this.animationData.frames.length;
            
            if (this.isLooping) {
                this.currentFrame = ((this.currentFrame % totalFrames) + totalFrames) % totalFrames;
            } else {
                if (this.currentFrame < 0) {
                    this.currentFrame = 0;
                    this._frameAccumulator = 0;
                    this.pause();
                    if (this.onComplete) this.onComplete();
                } else if (this.currentFrame >= totalFrames) {
                    this.currentFrame = totalFrames - 1;
                    this._frameAccumulator = 0;
                    this.pause();
                    if (this.onComplete) this.onComplete();
                }
            }
        }
        
        this._updateInterpolatedPose();
        this._notifyFrameChange();
    }

    _updateInterpolatedPose() {
        const frames = this.animationData.frames;
        const totalFrames = frames.length;
        
        const frameDuration = 1 / this.animationData.frameRate;
        const t = (this._frameAccumulator / frameDuration) + 0.5;
        
        let prevFrame = this.currentFrame;
        let nextFrame = this.isReversed ? this.currentFrame - 1 : this.currentFrame + 1;
        
        if (this.isLooping) {
            prevFrame = ((prevFrame % totalFrames) + totalFrames) % totalFrames;
            nextFrame = ((nextFrame % totalFrames) + totalFrames) % totalFrames;
        } else {
            nextFrame = Math.max(0, Math.min(totalFrames - 1, nextFrame));
        }
        
        const blendT = Math.max(0, Math.min(1, Math.abs(t - 0.5) * 2));
        
        if (blendT > 0.001 && prevFrame !== nextFrame) {
            const poseA = frames[prevFrame];
            const poseB = frames[nextFrame];
            const blended = poseA.lerp(poseB, blendT);
            this.currentPose.copyFrom(blended);
        } else {
            this.currentPose.copyFrom(frames[this.currentFrame]);
        }
        
        const totalFramesFloat = this.animationData.frames.length;
        this.currentTime = (this.currentFrame + (t - 0.5)) / this.animationData.frameRate;
        if (this.currentTime < 0) this.currentTime = 0;
        if (this.currentTime > this.getDuration()) this.currentTime = this.getDuration();
    }

    getInterpolatedPose(frameIndex, blendFactor) {
        if (!this.isReady()) return this.currentPose;
        
        const frames = this.animationData.frames;
        const totalFrames = frames.length;
        
        let prevFrame = Math.floor(frameIndex);
        let nextFrame = prevFrame + 1;
        
        if (this.isLooping) {
            prevFrame = ((prevFrame % totalFrames) + totalFrames) % totalFrames;
            nextFrame = ((nextFrame % totalFrames) + totalFrames) % totalFrames;
        } else {
            prevFrame = Math.max(0, Math.min(totalFrames - 1, prevFrame));
            nextFrame = Math.max(0, Math.min(totalFrames - 1, nextFrame));
        }
        
        const t = Math.max(0, Math.min(1, blendFactor));
        
        if (t > 0.001 && prevFrame !== nextFrame) {
            return frames[prevFrame].lerp(frames[nextFrame], t);
        } else {
            return frames[prevFrame];
        }
    }

    _notifyFrameChange() {
        if (this.onFrameChange) {
            this.onFrameChange(this.currentFrame, this.currentPose, this.currentTime);
        }
    }

    reset() {
        this.currentFrame = 0;
        this.currentTime = 0;
        this._frameAccumulator = 0;
        this.isPlaying = false;
        
        if (this.isReady()) {
            this.currentPose.copyFrom(this.animationData.frames[0]);
        }
        
        this._notifyFrameChange();
    }

    getPoseAtFrame(frameIndex) {
        if (!this.isReady()) return null;
        
        const frames = this.animationData.frames;
        const totalFrames = frames.length;
        
        let index = frameIndex;
        if (this.isLooping) {
            index = ((index % totalFrames) + totalFrames) % totalFrames;
        } else {
            index = Math.max(0, Math.min(totalFrames - 1, index));
        }
        
        return frames[index];
    }

    getNormalizedProgress() {
        if (!this.isReady() || this.animationData.frames.length <= 1) return 0;
        return this.currentFrame / (this.animationData.frames.length - 1);
    }

    getCurrentPose() {
        return this.currentPose;
    }

    getMetadata() {
        return this.animationData?.metadata || {};
    }

    getJointNames() {
        return this.animationData?.jointNames || [];
    }

    calculateMotionMetrics() {
        if (!this.isReady() || this.animationData.frames.length < 2) {
            return null;
        }

        const frames = this.animationData.frames;
        const jointCount = frames[0].getJointCount();
        
        let totalDistance = 0;
        let maxVelocity = 0;
        let maxAcceleration = 0;
        
        const rootIndex = 0;
        const frameDuration = 1 / this.animationData.frameRate;
        
        let prevPos = frames[0].getPosition(rootIndex);
        let prevVelocity = null;
        
        for (let i = 1; i < frames.length; i++) {
            const currPos = frames[i].getPosition(rootIndex);
            const dx = currPos[0] - prevPos[0];
            const dy = currPos[1] - prevPos[1];
            const dz = currPos[2] - prevPos[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            totalDistance += distance;
            
            const velocity = distance / frameDuration;
            maxVelocity = Math.max(maxVelocity, velocity);
            
            if (prevVelocity !== null) {
                const acceleration = Math.abs(velocity - prevVelocity) / frameDuration;
                maxAcceleration = Math.max(maxAcceleration, acceleration);
            }
            
            prevVelocity = velocity;
            prevPos = currPos;
        }

        return {
            totalDistance,
            averageSpeed: totalDistance / this.getDuration(),
            maxVelocity,
            maxAcceleration,
            frameCount: frames.length,
            duration: this.getDuration()
        };
    }
}
