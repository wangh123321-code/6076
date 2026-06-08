import { vec3 } from '../math/vec3.js';
import { quat } from '../math/quat.js';
import { BVHLoader } from './BVHParser.js';
import { CatSkeletonDefinition, CatSkeletonPose } from '../animation/CatSkeleton.js';

export class ConversionValidator {
    constructor() {
        this.bvhLoader = new BVHLoader();
        this.maxError = 0.001;
        this.results = [];
    }

    validateRoundTrip(animationData, options = {}) {
        const result = {
            passed: false,
            maxPositionError: 0,
            maxRotationError: 0,
            averagePositionError: 0,
            averageRotationError: 0,
            frameErrors: [],
            jointErrors: {},
            exportOptions: options
        };

        try {
            const bvhString = this.bvhLoader.exportToBVH(animationData, options);
            
            const imported = this.bvhLoader.loadFromString(bvhString, {
                targetUpAxis: 'z-up',
                targetUnit: 'meters',
                rotationOrder: options.rotationOrder || 'ZXY',
                mappingType: options.mappingType || 'motionBuilder'
            });

            const importedData = imported.animationData;

            const frameCount = Math.min(animationData.frameCount, importedData.frameCount);
            const jointCount = CatSkeletonDefinition.joints.length;

            let totalPosError = 0;
            let totalRotError = 0;
            let errorCount = 0;

            for (let f = 0; f < frameCount; f++) {
                const originalPose = animationData.frames[f];
                const importedPose = importedData.frames[f];

                const frameResult = {
                    frame: f,
                    maxJointError: 0,
                    maxJointName: '',
                    jointErrors: []
                };

                for (let j = 0; j < jointCount; j++) {
                    const originalPos = originalPose.getPosition(j);
                    const importedPos = importedPose.getPosition(j);
                    const posError = vec3.distance(originalPos, importedPos);

                    const originalRot = originalPose.getRotation(j);
                    const importedRot = importedPose.getRotation(j);
                    const dot = Math.abs(quat.dot(originalRot, importedRot));
                    const rotError = 2 * Math.acos(Math.min(1, Math.max(-1, dot)));

                    if (!result.jointErrors[j]) {
                        result.jointErrors[j] = {
                            jointName: CatSkeletonDefinition.getJointName(j),
                            maxPosError: 0,
                            maxRotError: 0,
                            avgPosError: 0,
                            avgRotError: 0,
                            errorCount: 0
                        };
                    }

                    const jointError = {
                        jointIndex: j,
                        jointName: CatSkeletonDefinition.getJointName(j),
                        positionError: posError,
                        rotationError: rotError
                    };
                    frameResult.jointErrors.push(jointError);

                    if (posError > frameResult.maxJointError) {
                        frameResult.maxJointError = posError;
                        frameResult.maxJointName = CatSkeletonDefinition.getJointName(j);
                    }

                    if (posError > result.maxPositionError) {
                        result.maxPositionError = posError;
                    }
                    if (rotError > result.maxRotationError) {
                        result.maxRotationError = rotError;
                    }

                    const je = result.jointErrors[j];
                    je.maxPosError = Math.max(je.maxPosError, posError);
                    je.maxRotError = Math.max(je.maxRotError, rotError);
                    je.avgPosError += posError;
                    je.avgRotError += rotError;
                    je.errorCount++;

                    totalPosError += posError;
                    totalRotError += rotError;
                    errorCount++;
                }

                result.frameErrors.push(frameResult);
            }

            if (errorCount > 0) {
                result.averagePositionError = totalPosError / errorCount;
                result.averageRotationError = totalRotError / errorCount;
            }

            for (const j in result.jointErrors) {
                const je = result.jointErrors[j];
                if (je.errorCount > 0) {
                    je.avgPosError /= je.errorCount;
                    je.avgRotError /= je.errorCount;
                }
            }

            result.passed = result.maxPositionError <= this.maxError;

        } catch (error) {
            result.error = error.message;
            result.passed = false;
        }

        this.results.push(result);
        return result;
    }

    compareDatasets(data1, data2, options = {}) {
        const result = {
            maxPositionError: 0,
            maxRotationError: 0,
            averagePositionError: 0,
            averageRotationError: 0,
            frameErrors: [],
            jointErrors: {}
        };

        const frameCount = Math.min(data1.frameCount, data2.frameCount);
        const jointCount = CatSkeletonDefinition.joints.length;

        let totalPosError = 0;
        let totalRotError = 0;
        let errorCount = 0;

        for (let f = 0; f < frameCount; f++) {
            const pose1 = data1.frames[f];
            const pose2 = data2.frames[f];

            const frameResult = {
                frame: f,
                maxJointError: 0,
                maxJointName: '',
                jointErrors: []
            };

            for (let j = 0; j < jointCount; j++) {
                const pos1 = pose1.getPosition(j);
                const pos2 = pose2.getPosition(j);
                const posError = vec3.distance(pos1, pos2);

                const rot1 = pose1.getRotation(j);
                const rot2 = pose2.getRotation(j);
                const dot = Math.abs(quat.dot(rot1, rot2));
                const rotError = 2 * Math.acos(Math.min(1, Math.max(-1, dot)));

                if (!result.jointErrors[j]) {
                    result.jointErrors[j] = {
                        jointName: CatSkeletonDefinition.getJointName(j),
                        maxPosError: 0,
                        maxRotError: 0,
                        avgPosError: 0,
                        avgRotError: 0,
                        errorCount: 0
                    };
                }

                const jointError = {
                    jointIndex: j,
                    jointName: CatSkeletonDefinition.getJointName(j),
                    positionError: posError,
                    rotationError: rotError
                };
                frameResult.jointErrors.push(jointError);

                if (posError > frameResult.maxJointError) {
                    frameResult.maxJointError = posError;
                    frameResult.maxJointName = CatSkeletonDefinition.getJointName(j);
                }

                if (posError > result.maxPositionError) {
                    result.maxPositionError = posError;
                }
                if (rotError > result.maxRotationError) {
                    result.maxRotationError = rotError;
                }

                const je = result.jointErrors[j];
                je.maxPosError = Math.max(je.maxPosError, posError);
                je.maxRotError = Math.max(je.maxRotError, rotError);
                je.avgPosError += posError;
                je.avgRotError += rotError;
                je.errorCount++;

                totalPosError += posError;
                totalRotError += rotError;
                errorCount++;
            }

            result.frameErrors.push(frameResult);
        }

        if (errorCount > 0) {
            result.averagePositionError = totalPosError / errorCount;
            result.averageRotationError = totalRotError / errorCount;
        }

        for (const j in result.jointErrors) {
            const je = result.jointErrors[j];
            if (je.errorCount > 0) {
                je.avgPosError /= je.errorCount;
                je.avgRotError /= je.errorCount;
            }
        }

        return result;
    }

    generateReport(result, format = 'text') {
        if (format === 'json') {
            return JSON.stringify(result, null, 2);
        }

        const lines = [];
        lines.push('=== 转换验证报告 ===');
        lines.push(`测试结果: ${result.passed ? '通过 ✓' : '失败 ✗'}`);
        lines.push(`最大位置误差: ${result.maxPositionError.toFixed(8)} (阈值: ${this.maxError})`);
        lines.push(`平均位置误差: ${result.averagePositionError.toFixed(8)}`);
        lines.push(`最大旋转误差: ${(result.maxRotationError * 180 / Math.PI).toFixed(6)}°`);
        lines.push(`平均旋转误差: ${(result.averageRotationError * 180 / Math.PI).toFixed(6)}°`);
        lines.push('');

        lines.push('--- 关节误差详情 ---');
        const jointsByMaxError = Object.values(result.jointErrors)
            .sort((a, b) => b.maxPosError - a.maxPosError);
        
        for (const je of jointsByMaxError.slice(0, 10)) {
            lines.push(`${je.jointName.padEnd(20)} 最大误差: ${je.maxPosError.toFixed(8)}  平均: ${je.avgPosError.toFixed(8)}`);
        }

        if (result.error) {
            lines.push('');
            lines.push(`错误: ${result.error}`);
        }

        return lines.join('\n');
    }

    validateCoordinateConversion() {
        const testCases = [
            {
                name: '单位矩阵旋转',
                quat: quat.create(0, 0, 0, 1),
                eulerZXY: [0, 0, 0],
                eulerXYZ: [0, 0, 0]
            },
            {
                name: 'X轴90度旋转',
                quat: (() => { const q = quat.create(); quat.fromEulerWithOrder(q, Math.PI/2, 0, 0, 'ZXY'); return q; })(),
                eulerZXY: [Math.PI/2, 0, 0]
            },
            {
                name: 'Y轴90度旋转',
                quat: (() => { const q = quat.create(); quat.fromEulerWithOrder(q, 0, Math.PI/2, 0, 'ZXY'); return q; })(),
                eulerZXY: [0, Math.PI/2, 0]
            },
            {
                name: 'Z轴90度旋转',
                quat: (() => { const q = quat.create(); quat.fromEulerWithOrder(q, 0, 0, Math.PI/2, 'ZXY'); return q; })(),
                eulerZXY: [0, 0, Math.PI/2]
            }
        ];

        const results = [];
        for (const test of testCases) {
            const euler = vec3.create();
            quat.toEuler(euler, test.quat, 'ZXY');
            
            const reconQuat = quat.create();
            quat.fromEulerWithOrder(reconQuat, euler[0], euler[1], euler[2], 'ZXY');
            
            const dot = Math.abs(quat.dot(test.quat, reconQuat));
            const rotError = 2 * Math.acos(Math.min(1, Math.max(-1, dot)));
            
            const pos = vec3.create(1, 2, 3);
            const convertedYZ = vec3.create();
            const convertedZY = vec3.create();
            
            const { CoordinateSystem } = require('../math/CoordinateSystem.js');
            CoordinateSystem.convertPosition(convertedYZ, pos, 'z-up', 'y-up');
            CoordinateSystem.convertPosition(convertedZY, convertedYZ, 'y-up', 'z-up');
            
            const posError = vec3.distance(pos, convertedZY);

            results.push({
                name: test.name,
                rotationError: rotError,
                positionError: posError,
                passed: rotError < 1e-6 && posError < 1e-6
            });
        }

        return results;
    }
}

export class BatchConverter {
    constructor() {
        this.bvhLoader = new BVHLoader();
        this.csvLoader = null;
        this.logger = new ConversionLogger();
        this.options = {
            targetUpAxis: 'z-up',
            targetUnit: 'meters',
            rotationOrder: 'ZXY',
            mappingType: 'motionBuilder',
            continueOnError: true,
            validateConversion: true
        };
    }

    setCSVLoader(loader) {
        this.csvLoader = loader;
    }

    async convertFiles(files, conversionType, options = {}) {
        Object.assign(this.options, options);
        const results = [];

        this.logger.info(`开始批量转换: ${files.length} 个文件, 类型: ${conversionType}`);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = {
                fileName: file.name || file,
                index: i,
                total: files.length,
                success: false,
                error: null,
                validation: null
            };

            try {
                this.logger.progress(i + 1, files.length, `处理文件: ${file.name || file}`);

                if (conversionType === 'csvToBvh') {
                    result.output = await this._csvToBvh(file);
                } else if (conversionType === 'bvhToCsv') {
                    result.output = await this._bvhToCsv(file);
                }

                if (this.options.validateConversion) {
                    const validator = new ConversionValidator();
                    if (conversionType === 'csvToBvh') {
                        result.validation = validator.validateRoundTrip(result.output.originalData, {
                            rotationOrder: this.options.rotationOrder,
                            mappingType: this.options.mappingType
                        });
                    }
                }

                result.success = true;
                this.logger.success(`转换完成: ${file.name || file}`);

            } catch (error) {
                result.error = error.message;
                this.logger.error(`转换失败: ${file.name || file}`, error);

                if (!this.options.continueOnError) {
                    this.logger.error('批量转换已终止（遇到错误）');
                    throw error;
                }
            }

            results.push(result);
        }

        this.logger.info(`批量转换完成: ${results.filter(r => r.success).length}/${files.length} 成功`);
        return results;
    }

    async _csvToBvh(file) {
        let animationData;
        
        if (typeof file === 'string') {
            const response = await fetch(file);
            const text = await response.text();
            const parser = new DOMParser();
            if (!this.csvLoader) {
                const { CSVLoader } = await import('./CSVParser.js');
                this.csvLoader = new CSVLoader();
            }
            const result = await this.csvLoader.parser.parse(text);
            animationData = result;
        } else if (file.content) {
            animationData = file.content;
        } else if (file.text) {
            const text = await file.text();
            if (!this.csvLoader) {
                const { CSVLoader } = await import('./CSVParser.js');
                this.csvLoader = new CSVLoader();
            }
            animationData = await this.csvLoader.parser.parse(text);
        } else {
            throw new Error('不支持的文件类型');
        }

        const bvhContent = this.bvhLoader.exportToBVH(animationData, {
            targetUpAxis: 'y-up',
            targetUnit: 'centimeters',
            rotationOrder: this.options.rotationOrder,
            mappingType: this.options.mappingType
        });

        return {
            bvhContent,
            originalData: animationData,
            fileName: (file.name || 'output').replace('.csv', '.bvh')
        };
    }

    async _bvhToCsv(file) {
        let text;
        
        if (typeof file === 'string') {
            const response = await fetch(file);
            text = await response.text();
        } else if (file.content) {
            text = file.content;
        } else if (file.text) {
            text = await file.text();
        } else {
            throw new Error('不支持的文件类型');
        }

        const result = this.bvhLoader.loadFromString(text, {
            targetUpAxis: this.options.targetUpAxis,
            targetUnit: this.options.targetUnit,
            rotationOrder: this.options.rotationOrder,
            mappingType: this.options.mappingType
        });

        const csvContent = this._animationDataToCSV(result.animationData);

        return {
            csvContent,
            animationData: result.animationData,
            bvhSkeleton: result.bvhSkeleton,
            fileName: (file.name || 'output').replace('.bvh', '.csv')
        };
    }

    _animationDataToCSV(animationData) {
        const lines = [];
        
        if (animationData.metadata) {
            for (const [key, value] of Object.entries(animationData.metadata)) {
                lines.push(`# ${key}: ${value}`);
            }
        }
        
        const headers = ['frame'];
        for (const jointName of animationData.jointNames) {
            headers.push(`${jointName}_x`, `${jointName}_y`, `${jointName}_z`);
            headers.push(`${jointName}_rot_x`, `${jointName}_rot_y`, `${jointName}_rot_z`, `${jointName}_rot_w`);
        }
        lines.push(headers.join(','));

        for (let f = 0; f < animationData.frameCount; f++) {
            const pose = animationData.frames[f];
            const values = [f];
            
            for (let j = 0; j < animationData.jointNames.length; j++) {
                const pos = pose.getPosition(j);
                const rot = pose.getRotation(j);
                values.push(
                    pos[0].toFixed(6),
                    pos[1].toFixed(6),
                    pos[2].toFixed(6),
                    rot[0].toFixed(6),
                    rot[1].toFixed(6),
                    rot[2].toFixed(6),
                    rot[3].toFixed(6)
                );
            }
            
            lines.push(values.join(','));
        }

        return lines.join('\n');
    }

    getLog() {
        return this.logger.getLog();
    }

    downloadFile(content, fileName) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export class ConversionLogger {
    constructor() {
        this.entries = [];
    }

    _log(level, message, error = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            error: error ? error.stack || error.message : null
        };
        this.entries.push(entry);
        console[level](`[${level.toUpperCase()}] ${message}`, error || '');
    }

    info(message) {
        this._log('info', message);
    }

    success(message) {
        this._log('info', `✓ ${message}`);
    }

    warning(message) {
        this._log('warn', message);
    }

    error(message, error = null) {
        this._log('error', message, error);
    }

    progress(current, total, message) {
        const percent = Math.round((current / total) * 100);
        this._log('info', `[${current}/${total} ${percent}%] ${message}`);
    }

    getLog() {
        return this.entries;
    }

    getLogAsText() {
        return this.entries.map(e => 
            `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}${e.error ? '\n' + e.error : ''}`
        ).join('\n');
    }

    downloadLog(fileName = 'conversion_log.txt') {
        const blob = new Blob([this.getLogAsText()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clear() {
        this.entries = [];
    }
}
