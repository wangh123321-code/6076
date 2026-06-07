import { vec3 } from '../math/vec3.js';
import { CatSkeletonDefinition, CatSkeletonRenderer } from '../animation/CatSkeleton.js';
import { TrajectoryRenderer } from '../animation/TrajectoryRenderer.js';

export class Scene {
    constructor(renderer, viewportId = 1) {
        this.renderer = renderer;
        this.viewportId = viewportId;
        
        this.skeletonRenderer = new CatSkeletonRenderer(renderer);
        this.trajectoryRenderer = new TrajectoryRenderer(renderer, this.skeletonRenderer);
        
        this.showSkeleton = true;
        this.showJoints = true;
        this.showGrid = true;
        this.showTrajectory = false;
        this.showLabels = false;
        
        this.displayOptions = {
            showSkeleton: true,
            showJoints: true,
            showTrajectory: false,
            showGrid: true,
            showLabels: false
        };

        this.highlightLimb = null;
        this.overrideColor = null;
    }

    setDisplayOption(option, value) {
        this.displayOptions[option] = value;
        
        if (option === 'showTrajectory') {
            this.trajectoryRenderer.enabled = value;
            if (value) {
                this.trajectoryRenderer.clearAllTrajectories();
            }
        }
    }

    setTrajectoryLength(length) {
        this.trajectoryRenderer.setMaxTrailLength(length);
    }

    setLimbVisibility(limb, visible) {
        this.trajectoryRenderer.setLimbVisibility(limb, visible);
    }

    setColorByLimb(enabled) {
        this.trajectoryRenderer.colorByLimb = enabled;
    }

    update(pose) {
        if (this.displayOptions.showTrajectory) {
            this.trajectoryRenderer.updateFromPose(pose);
        }
    }

    render(pose) {
        if (this.displayOptions.showGrid) {
            this.renderer.drawGrid({
                majorColor: [0.3, 0.5, 0.8, 0.5],
                minorColor: [0.2, 0.3, 0.5, 0.25],
                gridSize: 1
            });
        }

        if (this.displayOptions.showTrajectory) {
            this.trajectoryRenderer.render({
                showPoints: true,
                lineWidth: 2,
                fadeTrail: true
            });
        }

        if (this.displayOptions.showSkeleton || this.displayOptions.showJoints) {
            const options = {
                showSkeleton: this.displayOptions.showSkeleton,
                showJoints: this.displayOptions.showJoints,
                showLabels: this.displayOptions.showLabels,
                highlightLimb: this.highlightLimb
            };

            if (this.overrideColor) {
                this._renderWithOverrideColor(pose, options);
            } else {
                this.skeletonRenderer.render(pose, options);
            }
        }
    }

    _renderWithOverrideColor(pose, options) {
        const renderer = this.renderer;
        const showSkeleton = options.showSkeleton;
        const showJoints = options.showJoints;

        const jointCount = pose.getJointCount();
        const worldPositions = [];

        for (let i = 0; i < jointCount; i++) {
            const pos = vec3.create();
            pose.getPosition(i, pos);
            worldPositions.push(pos);
        }

        if (showSkeleton) {
            const startPoints = [];
            const endPoints = [];
            const colors = [];

            for (let i = 0; i < jointCount; i++) {
                const joint = CatSkeletonDefinition.joints[i];
                if (joint.parent >= 0) {
                    startPoints.push(worldPositions[joint.parent]);
                    endPoints.push(worldPositions[i]);
                    colors.push(this.overrideColor);
                }
            }

            renderer.drawLineSegments(startPoints, endPoints, colors, 3);
        }

        if (showJoints) {
            for (let i = 0; i < jointCount; i++) {
                const radius = this.skeletonRenderer.getJointRadius(i);
                renderer.drawSphere(worldPositions[i], radius, this.overrideColor, { ambient: 0.4 });
            }
        }
    }

    setOverrideColor(color) {
        this.overrideColor = color;
    }

    clearOverrideColor() {
        this.overrideColor = null;
    }

    clearTrajectories() {
        this.trajectoryRenderer.clearAllTrajectories();
    }

    getJointWorldPosition(pose, jointIndex) {
        return this.skeletonRenderer.getJointWorldPosition(pose, jointIndex);
    }

    getSkeletonBounds(pose) {
        const jointCount = pose.getJointCount();
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < jointCount; i++) {
            const pos = vec3.create();
            pose.getPosition(i, pos);
            minX = Math.min(minX, pos[0]);
            minY = Math.min(minY, pos[1]);
            minZ = Math.min(minZ, pos[2]);
            maxX = Math.max(maxX, pos[0]);
            maxY = Math.max(maxY, pos[1]);
            maxZ = Math.max(maxZ, pos[2]);
        }

        return {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ]
        };
    }

    dispose() {
        this.clearTrajectories();
    }
}

export class ComparisonAnalyzer {
    constructor(scene1, scene2) {
        this.scene1 = scene1;
        this.scene2 = scene2;
        this.showDifference = true;
        this.differenceThreshold = 0.01;
    }

    calculateDifference(pose1, pose2) {
        if (!pose1 || !pose2) return null;

        const jointCount = Math.min(pose1.getJointCount(), pose2.getJointCount());
        const differences = [];
        let totalDiff = 0;
        let maxDiff = 0;
        let maxDiffJoint = -1;

        for (let i = 0; i < jointCount; i++) {
            const pos1 = vec3.create();
            const pos2 = vec3.create();
            pose1.getPosition(i, pos1);
            pose2.getPosition(i, pos2);

            const dx = pos2[0] - pos1[0];
            const dy = pos2[1] - pos1[1];
            const dz = pos2[2] - pos1[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            differences.push({
                jointIndex: i,
                position1: [pos1[0], pos1[1], pos1[2]],
                position2: [pos2[0], pos2[1], pos2[2]],
                difference: [dx, dy, dz],
                distance: distance
            });

            totalDiff += distance;
            if (distance > maxDiff) {
                maxDiff = distance;
                maxDiffJoint = i;
            }
        }

        return {
            differences,
            totalDifference: totalDiff,
            averageDifference: totalDiff / jointCount,
            maxDifference: maxDiff,
            maxDifferenceJoint: maxDiffJoint,
            jointCount
        };
    }

    renderDifference(pose1, pose2, renderer) {
        if (!this.showDifference || !pose1 || !pose2) return;

        const diffData = this.calculateDifference(pose1, pose2);
        if (!diffData) return;

        const startPoints = [];
        const endPoints = [];
        const colors = [];
        const spherePositions = [];
        const sphereColors = [];
        const sphereRadii = [];

        for (const diff of diffData.differences) {
            if (diff.distance > this.differenceThreshold) {
                startPoints.push(diff.position1);
                endPoints.push(diff.position2);

                const intensity = Math.min(1, diff.distance / 0.5);
                const color = [
                    intensity,
                    0.3 * (1 - intensity),
                    0.3 * (1 - intensity),
                    0.8
                ];
                colors.push(color);

                spherePositions.push(diff.position2);
                sphereColors.push([1, 0.8, 0, 0.9]);
                sphereRadii.push(0.03 + diff.distance * 0.5);
            }
        }

        if (startPoints.length > 0) {
            renderer.drawLineSegments(startPoints, endPoints, colors, 2);
        }

        for (let i = 0; i < spherePositions.length; i++) {
            renderer.drawSphere(
                spherePositions[i],
                sphereRadii[i],
                sphereColors[i],
                { ambient: 0.5 }
            );
        }

        return diffData;
    }

    getComparisonMetrics(animation1, animation2) {
        if (!animation1 || !animation2) return null;

        const frameCount1 = animation1.getFrameCount();
        const frameCount2 = animation2.getFrameCount();
        const minFrames = Math.min(frameCount1, frameCount2);

        let totalDiff = 0;
        let maxTotalDiff = 0;
        let maxDiffFrame = 0;
        const frameDiffs = [];

        for (let frame = 0; frame < minFrames; frame++) {
            const pose1 = animation1.getPoseAtFrame(frame);
            const pose2 = animation2.getPoseAtFrame(frame);
            
            const diff = this.calculateDifference(pose1, pose2);
            if (diff) {
                frameDiffs.push({
                    frame,
                    totalDifference: diff.totalDifference,
                    averageDifference: diff.averageDifference,
                    maxDifference: diff.maxDifference
                });

                totalDiff += diff.totalDifference;
                if (diff.totalDifference > maxTotalDiff) {
                    maxTotalDiff = diff.totalDifference;
                    maxDiffFrame = frame;
                }
            }
        }

        return {
            frameCount: minFrames,
            averageTotalDifference: totalDiff / minFrames,
            maxTotalDifference: maxTotalDiff,
            maxDifferenceFrame: maxDiffFrame,
            frameDiffs
        };
    }

    setShowDifference(show) {
        this.showDifference = show;
    }

    setDifferenceThreshold(threshold) {
        this.differenceThreshold = Math.max(0.001, threshold);
    }
}
