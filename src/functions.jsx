/* eslint-disable no-undef */
import { loadSVGFromString, util, ActiveSelection, Group, Path, Line } from 'fabric';
import ReactDOMServer from 'react-dom/server'

/**
 * Handles the uploaded file, loads SVG content, and adds it to the canvas.
 *
 * @param {File} file - The file to be handled
 * @return {void} 
 */
export const handleFile = (file, canvas, color) => {
    if (file && file.type !== 'image/svg+xml') return;
  
    const reader = new FileReader();
    reader.onload = async (e) => {
        const svg = e.target.result;

        const loadedSvg = await loadSVGFromString(svg)
        console.log(loadedSvg)
        loadedSvg.objects.forEach(obj => {
            obj.set({
                stroke: color,
                strokeWidth: 10,
                fill: 'transparent',
            })
        })
        const svgObj = util.groupSVGElements(loadedSvg.objects, loadedSvg.options);
        svgObj.set({
            originX: 'center',
            originY: 'center',
            top: canvas.getCenter().top,
            left: canvas.getCenter().left
        })
        canvas.add(svgObj);
        canvas.renderAll();
    };
    reader.readAsText(file);
};
  

/**
 * Splits the active object into individual paths and creates separate fabric paths for each.
 * If the active object is a group, it converts it to an active selection
 * and removes the original group object.
 *
 * @return {void} No return value
 */
export const split = (canvas, saveState) => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.get('type') === 'activeSelection') return;
    if (activeObject.isFreeDraw) return;
    let fabricPaths = [];
    const strokeColor = activeObject.stroke;

    const createLine = (x,y, x1, y1) => {
        const line = new Line([ x,y, x1, y1 ], {
            selectable: true,
            hasControls: true,
            fill: 'transparent',
            stroke: strokeColor,
            strokeWidth: 10,
        });
        fabricPaths.push(line)
    }

    const createPath = (path) => {

        const fabricPath = new Path(path, {
            selectable: true,
            hasControls: true,
            fill: 'transparent',
            stroke: strokeColor,
            strokeWidth: 10,
        });
        fabricPaths.push(fabricPath);
    }
    
    if (activeObject.get('type') === 'group') {
        canvas.add(...activeObject.removeAll());
        canvas.remove(activeObject);
    } else {
        if (activeObject.path) {
            const mainArray = [];
            const paths = activeObject.path;
            fabricPaths = [];

            const multipleMFound = () => {
                let firstMFound = false;
                for (let path of paths) {
                    if (path[0] === 'M' && path.length === 3) {
                        if (firstMFound) {
                            return true;
                        } else {
                            firstMFound = true;
                        }
                    }
                }
                return false;
            }

            if (multipleMFound()) {
                console.log('Multiple M found')
                let array = [];
                for (let i = 0; i <= paths.length; i++) {
                    const line = paths[i] ? paths[i].join(' ') : null;
                    const command = paths[i] ? paths[i][0] : null;

                    if (command === 'M' || i === paths.length) {
                        if (array.length) mainArray.push(array.join(' '));
                        array = []
                    }
                    array.push(line);
                }
                for (let i = 0; i < mainArray.length; i++) {
                    if (mainArray[i] !== null) {
                        createPath(mainArray[i])
                    }
                }
            } else {
                console.log('Single M', paths)
                let lastX = 0;
                let lastY = 0;
                let mainMX = 0;
                let mainMY = 0;
                for (let i = 0; i < paths.length; i++) {
                    const command = paths[i][0];
                    let newLine = null;

                    if (command === 'M') {
                        // Move command (start new contour)
                        lastX = paths[i][1];
                        lastY = paths[i][2];
                        mainMX = paths[i][1];
                        mainMY = paths[i][2];

                    } else if (command === 'Z') {
                        if (mainMX === lastX && mainMY === lastY) continue
                        newLine = `M ${lastX} ${lastY} L ${mainMX} ${mainMY}`
                    } else {
                        newLine = `M ${lastX} ${lastY} ${paths[i].join(' ')}`;
                        lastX = paths[i][paths[i].length - 2];
                        lastY = paths[i][paths[i].length - 1];
                    }

                    if (newLine) createPath(newLine);
                }
            }
        } else if (activeObject.type === 'rect') {
            fabricPaths = [];
            const topLeft = { x: activeObject.left, y: activeObject.top };
            const topRight = { x: activeObject.left + activeObject.width, y: activeObject.top };
            const bottomLeft = { x: activeObject.left, y: activeObject.top + activeObject.height };
            const bottomRight = { x: activeObject.left + activeObject.width, y: activeObject.top + activeObject.height };

            createLine(topLeft.x, topLeft.y, topRight.x, topRight.y);
            createLine(topRight.x, topRight.y, bottomRight.x, bottomRight.y);
            createLine(bottomRight.x, bottomRight.y,  bottomLeft.x, bottomLeft.y);
            createLine(bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y);

        } else if (activeObject.type === 'polygon') {
            fabricPaths = []
            const points = activeObject.points;

            for (let i=0; i < points.length; i++) {
                const start = points[i];
                const end = points[(i + 1) % points.length];
                createLine(start.x, start.y, end.x, end.y)
            }

        } else if (activeObject.type === 'triangle') {
            fabricPaths = [];
            let left = activeObject.left;
            let top = activeObject.top;
            let width = activeObject.width;
            let height = activeObject.height;

            let topX = left + width / 2;
            let topY = top;

            let bottomLeftX = left;
            let bottomLeftY = top + height;

            let bottomRightX = left + width;
            let bottomRightY = top + height;

            createLine(topX, topY, bottomLeftX, bottomLeftY);
            createLine(bottomLeftX, bottomLeftY, bottomRightX, bottomRightY);
            createLine(bottomRightX, bottomRightY, topX, topY);
        }

        if (fabricPaths.length > 0) {
            canvas.off('object:added', saveState);

            // fabricPaths.forEach(obj => {
            //     console.log(
            //         'Object : ', obj
            //     )
            // })
            // fabricPaths = fabricPaths.filter(obj => (obj.width !== 0 || obj.height !== 0))

            const group = new Group(fabricPaths);
            group.set({
                originX: 'center',
                originY: 'center',
                left: activeObject.left,
                top: activeObject.top,
                scaleX: activeObject.scaleX,
                scaleY: activeObject.scaleY,
                angle: activeObject.angle,
            })
            group.setCoords()

            const objects = [...group.removeAll()];
            console.log(
                'Group : ', group,
                '\nObjects : ', objects
            )
            canvas.add(...objects)
            canvas.remove(activeObject);
            canvas.on('object:added', saveState);
        }
    }
    canvas.renderAll();
}



/**
 * Function to group selected objects together.
 */
export const group = (canvas, saveState) => {
    const activeObject = canvas.getActiveObject();
    const objects = activeObject.getObjects();
    if (!activeObject || activeObject.get('type') !== 'activeselection') return;

    canvas.off('object:removed', saveState);
    objects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    const group = new Group(objects, {
        subTargetCheck: true,
        // interactive: true
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.on('object:removed', saveState);
    
    canvas.renderAll();
}


/**
 * Copies the active object on the canvas.
 *
 * @param {Function} setCopiedObject - A function to set the copied object.
 */
export const copyObject = (setCopiedObject, canvas) => {
    if (canvas) {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.clone().then((clonedObject) => {
                canvas.discardActiveObject();
                setCopiedObject(clonedObject);
                console.log('Object copied', );
            })
        } else {
            console.log('No object selected to copy');
        }
    }
};


/**
 * Function to paste the copied object onto the canvas.
 *
 * @param {Object} copiedObject - The object to be pasted.
 * @return {void} 
 */
export const pasteObject = (copiedObject, canvas) => {

    if (copiedObject) {
        copiedObject.clone().then((clonedObject) => {

            clonedObject.set({
                left: clonedObject.left + 10,
                top: clonedObject.top + 10,
                evented: true,
            });

            if (clonedObject.get('type') === 'activeselection') {
                clonedObject.canvas = canvas;
                clonedObject.forEachObject((obj) => {
                    canvas.add(obj);
                });
                clonedObject.setCoords();
            } else {
                canvas.add(clonedObject);
            }
            
            copiedObject.top += 10;
            copiedObject.left += 10;
            canvas.setActiveObject(clonedObject);
            canvas.requestRenderAll();
        });
    } else {
        return
    }
};


/**
 * Deletes the active object on the canvas if present.
 */
export const deleteObject = (canvas) => {
    if (canvas && canvas.getActiveObject()) {
        const activeObject = canvas.getActiveObject();
        if (activeObject.get('type') === 'activeselection') {
            activeObject.forEachObject((obj) => {
                canvas.remove(obj);
            });
        } else {
            canvas.remove(activeObject);
        }
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }
}


/**
 * A function to select all objects on the canvas.
 */
export const selectAllObject = (canvas) => {
    if (!canvas) return;
    if (['tool', 'Elements', 'Pen', 'Plot'].includes(canvas.mode)) return;

    canvas.discardActiveObject();
    const objects = canvas.getObjects().filter(obj => obj.get('name') !== 'ToolHead');
    const selection = new ActiveSelection(objects, { canvas: canvas });
    canvas.setActiveObject(selection);
    canvas.requestRenderAll();
}


export const handleKeyDown = ( copiedObject, setCopiedObject, canvas ) => (e) => {
    const keyStroke = e.key.toLowerCase();
    const activeElement = document.activeElement;

    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' ) return

    if (e.ctrlKey && keyStroke === 'c') {
        copyObject(setCopiedObject, canvas);
    } else if (e.ctrlKey && keyStroke === 'v') {
        pasteObject(copiedObject, setCopiedObject, canvas);
    } else if (keyStroke === 'delete' || keyStroke === 'backspace') {
        deleteObject(canvas);
    } else if (e.ctrlKey && keyStroke === 'a') {
        selectAllObject(canvas);
        e.preventDefault();
    }else if (e.ctrlKey && keyStroke === 'g' && e.shiftKey) {
        split(canvas);
        e.preventDefault();
    } else if (e.ctrlKey && keyStroke === 'g') {
        group(canvas);
        e.preventDefault();
    } else if (e.ctrlKey && keyStroke === 'z') {
        undo()
        e.preventDefault();
    } else if (e.ctrlKey && keyStroke === 'y') {
        redo()
        e.preventDefault();
    }
};

export const info = (canvas) => {
    if (!canvas && !canvas.getActiveObject()) return;
    const activeObject = canvas.getActiveObject();
    console.log('SVG ::: ', activeObject.toSVG())
    canvas.renderAll();
}

export const componentToUrl = (Component, rotationAngle = 0) => {
    let svgString = ReactDOMServer.renderToStaticMarkup(<Component size={20} strokeWidth={1.5} color={'#4b5563'}  />)
    svgString = svgString.replace(
        '<svg ',
        `<svg transform="rotate(${rotationAngle})" `
      );

    const blob = new Blob([svgString], { type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);

    return url
}
