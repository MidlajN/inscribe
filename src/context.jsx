/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { handleKeyDown } from "./functions";
import { Canvas, util, Path, BaseFabricObject, FabricObject, InteractiveFabricObject} from "fabric";
// import 'fabric-history';


const CanvasContext = createContext(null);

export default function useCanvas() {
    return useContext(CanvasContext);
}

export const CanvasProvider = ({ children }) => {
    const canvasRef = useRef(null);
    const [ canvas, setCanvas ] = useState(null);
    const [ objectValues, setObjectValues ] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotateAngle: 0 });
    const [ copiedObject, setCopiedObject ] = useState(null);
    

    useEffect(() => {
        // FabricObject.prototype.cornerStyle = 'circle';
        // FabricObject.prototype.cornerColor = '#7f77eb85';
        // FabricObject.prototype.transparentCorners = false;
        // FabricObject.prototype.cornerSize = 15;
        // FabricObject.prototype.borderScaleFactor = 3;
        // FabricObject.prototype.noScaleCache = true;

        const fabricCanvas = new Canvas(canvasRef.current, {
            width: util.parseUnit('210mm'),
            height: util.parseUnit('149mm'),
            backgroundColor: 'white',
            fireRightClick: true,
            stopContextMenu: true,
            centeredRotation: true,
            selection: false,
        });

        fabricCanvas.renderAll()

        setCanvas(fabricCanvas);
        return () => fabricCanvas.dispose();
    }, []);


    useEffect(() => {
        if (canvas === null) return;

        canvas.on('object:modified', () => {
            const activeObject = canvas.getActiveObject();

            if (activeObject) {
                const x = parseFloat(activeObject.left.toFixed(2));
                const y = parseFloat(activeObject.top.toFixed(2));
                const scaleX = parseFloat(activeObject.scaleX.toFixed(2));
                const scaleY = parseFloat(activeObject.scaleY.toFixed(2));
                const angle = parseFloat(activeObject.angle.toFixed(2));

                setObjectValues({ x: x, y: y, scaleX: scaleX, scaleY: scaleY, rotateAngle: angle });
            }
        });

        return () => {
            canvas.off('object:modified');
        }
    }, [canvas, objectValues]);

    useEffect(() => {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();

        if (activeObject) {
            activeObject.set({
                left: objectValues.x, 
                top: objectValues.y, 
                scaleX: objectValues.scaleX, 
                scaleY: objectValues.scaleY, 
                angle: objectValues.rotateAngle
            })
            canvas.renderAll();
        }
    }, [canvas, objectValues]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown( copiedObject, setCopiedObject, canvas ));

        return () => { 
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [canvas, copiedObject]);

    return (
        <CanvasContext.Provider 
            value={{ 
                canvas, 
                canvasRef, 
                objectValues, 
                setObjectValues, 
            }}
        >
            { children }
        </CanvasContext.Provider>
    );
};


const ComContext = createContext(null);

export function useCom() {
    return useContext(ComContext);
}

export const CommunicationProvider = ({ children }) => {
    const { canvas } = useCanvas()
    const [ response, setResponse ] = useState({ pageId: '', message: '' });
    const [ job, setJob ] = useState({ connecting: false, connected: false, started: false, paused: false, percentage: null });
    const [ progress, setProgress ] = useState({ uploading: false, converting: false, progress: 0 })
    const [ setupModal, setSetupModal ] = useState(false);
    const [ ws, setWs ] = useState(null);
    const [colors, setColors] = useState([
        { color: '#ff0000', name: 'Red', zValue: -9, command: "G6.1" },
        { color: '#ffa500', name: 'Orange', zValue: -9.8, command: "G6.6" },
        { color: '#000000', name: 'Black', zValue: -10.2, command: "G6.7" },
        { color: '#227fe3', name: 'Blue', zValue: -9.8, command: "G6.5" },
        { color: '#ffff00', name: 'Yellow', zValue: -9.5, command: "G6.3" },
        { color: '#008000', name: 'Green', zValue: -9.9, command: "G6.4" },
        { color: '#ffc0cb', name: 'Pink', zValue: -9.5, command: "G6.2" },
        { color: '#a52a2a', name: 'Brown', zValue: -9.5, command: "G6.8" },
    ]);
    const [ config, setConfig ] = useState({
        // url: window.location.hostname,
        url: '192.168.0.1',
        feedRate: 10000,
        jogSpeed: 12000,
        zOffset: 10,
        open: false
    });

    const dotRef = useRef();    

    const jogSpeedRef = useRef(config.jogSpeed);
    const pageIdRef = useRef(response.pageId);

    useEffect(() => {
        jogSpeedRef.current = config.jogSpeed;
        pageIdRef.current = response.pageId;
    }, [ config.jogSpeed, response.pageId ]);

    const openSocket = useCallback(() => {
        setSetupModal(true);
        if (ws !== null) return;
        try {
            setJob({ ...job, connecting: true, connected: false, started: false })
                
            const socket = new WebSocket(`ws://${ config.url }:81`, ['arduino']);
            socket.binaryType = 'arraybuffer';
            setWs(socket)

        } catch (err) {
            console.error('Error In OpenSocket : ', err)
            setWs(null);
        }
    }, [config.url, ws])

    const closeSocket = useCallback(() => {
        setProgress({ uploading: false, converting: false, progress: 0 });
        setJob({ ...job, connecting: false, connected: false, started:  false });
        setResponse({ ...response, pageId: ''})
        ws?.close();
        setWs(null);
    }, [ws])

    const sendToMachine = useCallback((gcode) => {
        let url = `http://${ config.url }/command?commandText=`;

        console.log(' Clicked : ', gcode);
        fetch(url + encodeURI(gcode) + `&PAGEID=${pageIdRef.current}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Http Error Status : ', response.status);
            }
        })
        .catch(err => {
            console.error('Fetch Error ->\n', err)
        });
    }, [config.url])

    const handleJog = useCallback((e) => {
        const { shiftKey, ctrlKey, key } = e;
        const jogCommands = {
            ArrowUp: {
                normal: `$J=G91 G21 F${ jogSpeedRef.current } Y10`,
                shift: `$J=G91 G21 F${ jogSpeedRef.current / 10 } Z1`,
                shiftCtrl: `$J=G91 G21 F${ jogSpeedRef.current / 10 } Z.1`
            },
            ArrowDown: {
                normal: `$J=G91 G21 F${ jogSpeedRef.current } Y-10`,
                shift: `$J=G91 G21 F${ jogSpeedRef.current / 10 } Z-1`,
                shiftCtrl: `$J=G91 G21 F${ jogSpeedRef.current / 10 } Z-.1`
            },
            ArrowLeft: {
                normal: `$J=G91 G21 F${ jogSpeedRef.current } X-10`,
            },
            ArrowRight: {
                normal: `$J=G91 G21 F${ jogSpeedRef.current } X10`,
            }
        }

        if (jogCommands[key]) {
            e.preventDefault();
            if (shiftKey && ctrlKey && jogCommands[key].shiftCtrl) {
                sendToMachine(jogCommands[key].shiftCtrl);
            } else if (shiftKey && jogCommands[key].shift) {
                sendToMachine(jogCommands[key].shift);
            } else if (jogCommands[key].normal) {
                sendToMachine(jogCommands[key].normal);
            }
        }
    },[sendToMachine])

    useEffect(() => {
        if (response.pageId === '') return;

        console.log('Page ID ', response.pageId)
        sendToMachine('$H\n$Report/interval=50');

        dotRef.current = new Path('M -50,0 L 50,0 M 0,-50 L 0,50 M -25,-25 V-25,25 H25,25 V25,-25 Z', {
            stroke: '#2a334e28', 
            strokeWidth: 8,
            fill: '#2a334e28',
            originX: 'center',
            originY: 'center',
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            top: 550 * 96 / 25.4,
            left: 0,
            // top: 900,
            // left: 600,
            name: 'ToolHead',
            selectable: false,
            hoverCursor: 'auto'
        });

        let snapped = false;

        canvas.on('object:moving', (e) => {

            const movingObject = e.target;
            const [ mTopLeft, mTopRight, mBottomRight, mBottomLeft ] = movingObject.getCoords();
            const dotCenter = dotRef.current.getCenterPoint();

            const calculateDist = (point, centerX, centerY) => {
                const dx = point.x - centerX;
                const dy = point.y - centerY;
                return Math.sqrt(dx * dx + dy * dy);
            }

            const topLeftDistance = calculateDist(mTopLeft, dotCenter.x, dotCenter.y);
            const topRightDistance = calculateDist(mTopRight, dotCenter.x, dotCenter.y);
            const bottomLeftDistance = calculateDist(mBottomLeft, dotCenter.x, dotCenter.y);
            const bottomRightDistance = calculateDist(mBottomRight, dotCenter.x, dotCenter.y);

            const shortestDistance = Math.min(topLeftDistance, topRightDistance, bottomLeftDistance, bottomRightDistance);

            if (!snapped && shortestDistance < 80) {
                const horizontalD = mTopRight.x - mTopLeft.x;
                const verticalD = mBottomLeft.y - mTopLeft.y;

                if (shortestDistance === topLeftDistance) {
                    movingObject.set({
                        left: dotCenter.x,
                        top: dotCenter.y
                    })
                }
                else if (shortestDistance === topRightDistance) {
                    movingObject.set({
                        left: dotCenter.x - horizontalD,
                        top: dotCenter.y
                    })
                }
                else if (shortestDistance === bottomLeftDistance){
                    movingObject.set({
                        left: dotCenter.x,
                        top: dotCenter.y - verticalD
                    })
                }
                else if (shortestDistance === bottomRightDistance) {
                    movingObject.set({
                        left: dotCenter.x - horizontalD,
                        top: dotCenter.y - verticalD
                    })
                }  
                movingObject.setCoords();
                setTimeout(() => { snapped = true }, 500)
            } else {
                setTimeout(() => { snapped = false }, 500)
            }
        });

        canvas.on('mouse:up', () => { snapped = false; });

        canvas.add(dotRef.current);
        canvas.renderAll();
        return () => {
            canvas.remove(dotRef.current);    
        }
    }, [response.pageId])

    useEffect(() => {
        if (!ws) return;

        const handleSocketOpen = () => {
            setJob({ ...job, connecting: false, connected: true, started: false });
            setTimeout(() => { setSetupModal(false) }, 3000);

            if (!window._keydownListenerAdded) {
                window.addEventListener('keydown', handleJog)
                window._keydownListenerAdded = true;
            }
        }

        const handleSocketMessage =  (message, gcode = null) => {

            if (message.startsWith('<')) {
                const data = message.match(/<([^>]+)>/)[1];
                const [ status, position, feed ] = data.split('|');
                const sdPercent = data.split('|').pop().includes('SD') ? data.split('|').pop() : null
                const percentage = sdPercent ? parseInt(sdPercent.split(',')[0].split(':')[1]) : null
                setJob(prev => ({ ...prev, percentage:  percentage === null && prev.started ? 100 : percentage }))

                const coords = position.split(':')[1];
                const [ x, y, z ] = coords.split(',').map(parseFloat);
 
                // SD:100.00,/sd/job.gcode
                console.log(
                    'Data : ', data,
                    '\nSplits : ', data.split('|'),
                    '\nSD Percent : ', sdPercent, ' <-> ', percentage
                );

                dotRef.current.set({
                    top: (550 - y) * 96 / 25.4,
                    left: x * 96 / 25.4,
                });
                canvas.renderAll();

                console.log(`Status: ${status}\nX: ${x} Y: ${y} Z: ${z} Feed: ${feed}\n`);
            } else {
                if (message.includes('/job.gcode job sent')) {
                    console.log('The Indicator found', job);

                    // setTimeout(() => { setJob({ ...job, connecting: false, connected: true, percentage: 100 }) }, 5000)
                    setTimeout(() => { setJob({ ...job, started: false, percentage: null }) }, 7000)
                }

                setResponse(prev => ({
                    ...prev,
                    message: prev.message + message
                }));

            }
    
            if (gcode) sendToMachine(gcode);
        }

        const handleBlob = (event) => {
            const reader = new FileReader();
            reader.onload = () => {
                const text = reader.result;
                handleSocketMessage(text);
            }
            reader.readAsText(event.data)
        }

        const handleArrayBuffer = (event) => {
            const arrayBuffer = event.data;
            const uint8array = new Uint8Array(arrayBuffer)
            const text = new TextDecoder().decode(uint8array);
            // console.log('Uint8Array : ', uint8array, 'text : ', text)
            const [key, valueStr] = text.split(':', 2);
            if (!valueStr) return;
            const value = parseInt(valueStr.trim());

            if(!isNaN(value)) {
                switch (true) {
                    case key === 'error' && value === 8:
                        handleSocketMessage('The Machine is in Alarm state \nChanging...\n', '$X');
                        break;
                    case key === 'ALARM' && value === 1:
                        handleSocketMessage('Hard Limit Triggered \nRe-Homing...\n', '$H');
                        break;
                    case key === 'ALARM' && value === 8:
                        handleSocketMessage('Hard Limit Triggered \nRe-Homing...\n', '$X\nG1 X10Y10Z-10 F3000\n$H');
                        break;
                    default:
                        break;
                }
            } 
            handleSocketMessage(text);
        }

        const handleText = (event) => {
            const [key, value] = event.data.split(':');

            if (key !== 'PING') {
                console.log(key, parseInt(value, 10));
                setResponse(prev => ({ 
                    pageId: parseInt(value, 10), 
                    message: prev.message + event.data + "\n"
                }));
            }
        }

        const handleSocketClose = () => {
            setWs(null);
            setJob({ ...job, connected: false, connecting: false, started: false });
            setResponse(prev => ({ ...prev, message: prev.message + 'Socket Connection Closed ... \n' }));

            window.removeEventListener('keydown', handleJog);
            window._keydownListenerAdded = false;
        }

        const handleSocketError = (err) => {
            console.error('Socket error :-> ', err);
            setJob({ ...job, connected: false, connecting: false, started: false })
        }

        ws.onopen = handleSocketOpen;

        ws.onmessage = (event) => {
            if (event.data instanceof Blob) {
                handleBlob(event);
            } else if (event.data instanceof ArrayBuffer) {
                handleArrayBuffer(event);
            } else {
                handleText(event)
            }
        }

        ws.onclose = handleSocketClose;
        ws.onerror = handleSocketError;

    }, [handleJog, job, sendToMachine, ws])


    return (
        <ComContext.Provider 
            value={{
                response,
                setResponse,
                job,
                setJob,
                ws,
                setWs,
                setupModal, 
                setSetupModal,
                progress, 
                setProgress,
                colors,
                setColors,
                config,
                setConfig,
                openSocket,
                closeSocket,
                sendToMachine,
            }}
        >
            { children }
        </ComContext.Provider>
    )

}