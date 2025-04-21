// Conversion Related Function Which are essential for the the Gcode generation and Svg Generation from the FabricJS 
import tinycolor from "tinycolor2";
import { Converter } from "svg-to-gcode";
// import { ActiveSelection, Canvas, Group, StaticCanvas, util } from "fabric";

// TO FIX 
const returnObjs = async (objects) => {
    const clonedObjs = await Promise.all(
        objects
            .filter((obj) => obj.get('name') !== 'ToolHead' && obj.get('name') !== 'BedSize' && obj.get('name') !== 'background')
            .map(((obj) => obj.clone()))
    );

    return clonedObjs.flatMap( (obj) => obj.type === 'group' ? obj.removeAll() : obj )
}

export const returnGroupedObjects = async (canvas) => {
    canvas.discardActiveObject();
    canvas.renderAll();
    const objects = await returnObjs(canvas.getObjects());
    return objects.reduce((acc, object) => {
        // console.log('Object : ', object, ' Stroke : ' ,object.stroke)
        const stroke = tinycolor(object.stroke).toHexString();
        acc[stroke] = acc[stroke] || [];
        acc[stroke].push(object)
        return acc
    }, {});
}


export const returnSvgElements = (objects, width, height) => {
    const svgElements = []

    for (const stroke in objects) {
        let groupSVG = '';
        if (objects[stroke].length > 1) {
            objects[stroke].forEach(obj => {
                const svg = obj.toSVG();
                groupSVG += svg;
            });
        } else {
            const svg = objects[stroke][0].toSVG()
            groupSVG += svg
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${ width } ${ height }`);
        svg.innerHTML = groupSVG;

        const data = {
            color : stroke,
            svg : svg.outerHTML
        }
        svgElements.push(data);
    }

    return svgElements
}


export const sortSvgElements = (svgElements, colors) => {
    const colorOrder = colors.reduce((acc, colorObject, index) => {
        acc[colorObject.color] = index
        return acc
    }, {});

    svgElements.sort((a, b) => colorOrder[a.color] - colorOrder[b.color]);
}


export const convertToGcode = async (svgElements, colors, config) => {
    const gcodes = await Promise.all(svgElements.map( async (element) => {
        const color = colors.find(objects => objects.color === element.color);
        console.log('color "', color, element, colors)

        // let settings = {
        //     zOffset: config.zOffset,
        //     feedRate: config.feedRate,
        //     seekRate: config.seekRate,
        //     zValue: color.zValue,
        //     tolerance: 0.1,
        //     ignoreNegative: true,
        //     minimumArea: 2.5,
        //     sortByArea: false,
        //     bedSize: {
        //         width: 800,
        //         height: 540
        //     }
        // }
        let settings = {
            zOffset: config.zOffset,
            feedRate: config.feedRate,
            // zValue: color.zValue,
            zValue: Number(color.zValue),
            tolerance: 0.3,
            quadrant: 1,
            minimumArea: 2.5,
            // xOffset: framing ? -20 : 0,
            // yOffset: framing ? 12.6 : 0,
            zMoveTime: 0.7,
            bedSize: {
                width: 1500,
                height: 1000
            }
        }

        // console.log('Element From to convertToGcode : ', element.svg)
        const converter = new Converter(settings);
        const [ code ] = await converter.convert(element.svg);
        const gCodeLines = code.split('\n');

        // const filteredGcodes = gCodeLines.filter(command => (command !== `G1 F${config.feedRate}` && !command.startsWith('G0 Z')));
        const filteredGcodes = gCodeLines.filter(command => (command !== `G1 F${config.feedRate}`));

        function hexToDecimal(hex) {
            hex = hex.replace(/^#/, '');
            return parseInt(hex, 16);
        }

        const newCode = filteredGcodes.map(command => {
            if (command === `G0 Z${color.zValue}`) return `${color.penPick.join('')}${hexToDecimal(color.color)}`
            else if (command === `G0 Z${ color.zValue - config.zOffset }`) return color.penDrop.join('\n')
            else return command
        })
// 
        // console.log('Filtered G-Code :', newCode.join('\n'))
        const cleanedGcodeLines = newCode.slice(0, -1);
        cleanedGcodeLines.splice(0, 2);
        cleanedGcodeLines.splice(1, 1);

        // return color.penPick.join('\n') + '\n' + cleanedGcodeLines.join('\n') + color.penDrop.join('\n') ;
        // return color.penPick + '\n' + cleanedGcodeLines.join('\n') + color.penDrop ;
        return cleanedGcodeLines.join('\n');
    }));

    return [
        // '$H', 
        // 'G53 X0Y0',
        // 'G0 X380Y380',
        // 'G10 L20 P0 X0 Y0 Z0', 
        `G0 F${config.jogSpeed}`,
        `G1 F${config.feedRate} `, 
        ...gcodes, 
        'G0 X0Y0'
    ]
}
