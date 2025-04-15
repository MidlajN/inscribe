import './App.css'
import { Logo, Pen, Eraser, ArrowLeft, ArrowUp, Home, Cross, Report, Pause, Resume, Refresh, Settings, Undo, Redo, MousePointer, DownloadIcon, CameraIcon, CloseIcon } from './icons'
import useCanvas, { useCom } from './context'
import { useEffect, useState , useRef } from 'react';
import { FabricImage, PencilBrush,  } from 'fabric';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { convertToGcode, returnGroupedObjects, returnSvgElements, sortSvgElements } from './convert';
import { handleFile } from './functions';

function App() { 
  const { canvasRef } = useCanvas();
  const { job } = useCom();
  const [ pan, setPan ] = useState(false);

  return (
    <>
      <div className='flex flex-col h-screen overflow-hidden'>
      
        {/* ---------- Navbar ---------- */}
        <div className='bg-white px-4 py-[0.65rem] rounded-xl flex gap-1 items-end absolute left-4 top-5 z-10'>
          <Logo width={138} height={35}/>
          <p 
            className='text-[12px] font-medium tracking-wide'
            style={{ color: job.connected ? '#009a1b' : job.connecting ? '#006dcb' : '#f10000'}}
          >
            { job.connected ? 'Connected' : job.connecting ? 'Connecting' : 'Failed' }
          </p>
        </div>
        <SetUp pan={pan} setPan={setPan} />

        {/*  ---------- Canvas ---------- */}
        <section 
          className='canvas-container' 
        >
          <TransformWrapper
            initialScale={0.75} 
            maxScale={1}
            minScale={.3} 
            panning={ pan ? { excluded: ['fabricCanvas'] } : null }
            centerOnInit 
            limitToBounds={ !pan }
            velocityAnimation={false}
            disabled={ !pan }
          >
            <TransformComponent
              wrapperStyle={{  
                width: '100dvw',
                height: '100dvh',
                overflow:'visible', 
              }}
            >
              <div className=' w-full h-full shadow-lg m-auto border'>
                <canvas ref={ canvasRef } className="fabricCanvas"></canvas>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </section>
      </div>
    </>
  )
}
export default App

// eslint-disable-next-line react/prop-types
function SetUp({ pan, setPan }) {
  const { colors, openSocket, job, ws } = useCom();
  const { canvas, redo, undo } = useCanvas();

  const [ stroke, setStroke ] = useState('#5e5e5e');
  const [ tool, setTool ] = useState('Pen');
  const [ streaming, setStreaming ] = useState(true);

  useEditorSetup({ 
    stroke: stroke,
    tool: tool,
    pan: pan,
    setPan: setPan
  });

  // useEffect(() => { 
  //   if (ws) return;
  //   if (!job.connected) {
  //     openSocket()
  //   }
  // }, [ws, job.connected, openSocket])

  return (
    <>
      <div className='setup'>
        <div
          className='p-0.5'
          style={{ borderBottom: tool === 'Select' ? '2px solid #ff965b' : null}}
          onClick={() => {
            setTool('Select');
          }}
        >
            <MousePointer width={25} height={25}/>
        </div>
        <div
          className='p-0.5'
          style={{ borderBottom: tool === 'Pen' ? '2px solid #ff965b' : null}}
          onClick={() => {
            setTool('Pen');
          }}
          >
          <Pen width={25} height={25}/>
        </div>
        <div 
          className='p-0.5'
          style={{ borderBottom: tool === 'Eraser' ? '2px solid #ff965b' : null}}
          onClick={() => {
            setTool('Eraser');
          }}
          >
          <Eraser width={25} height={25}/>
        </div>
        <div 
          className='p-2 shadow-inner bg-[#fafafa] hover:bg-[#ebebeb] active:bg-[#fafafa] rounded-full transition-all duration-100 import overflow-hidden'
          // style={{ borderBottom: tool === 'Eraser' ? '2px solid #ff965b' : null}}
          >
          <input type="file" accept="image/svg+xml"  onInput={ e => handleFile(e.target.files[0], canvas) } />
          <DownloadIcon width={23} height={23}/>
        </div>
        <div 
          className='p-2 shadow-inner bg-[#fafafa] hover:bg-[#ebebeb] active:bg-[#fafafa] rounded-full transition-all duration-100'
          onClick={undo}
          >
          <Undo width={25} height={25}/>
        </div>
        <div 
          className='p-2 shadow-inner bg-[#fafafa] hover:bg-[#ebebeb] active:bg-[#fafafa] rounded-full transition-all duration-100'
          onClick={redo}
          >
          <Redo width={25} height={25}/>
        </div>
        <div 
          className='p-3 shadow-inner bg-[#fafafa] hover:bg-[#ebebeb] active:bg-[#fafafa] rounded-full transition-all duration-100'
          onClick={() => {
            canvas.getObjects().forEach((obj) => {
              if (obj.get('name') !== 'ToolHead' && obj.get('name') !== 'BedSize') {
                canvas.remove(obj);
              }
            });
            canvas.renderAll();
          }}
          >
          <Refresh width={20} height={20} />
        </div>
        <div 
          className='p-3 bg-[#fafafa] hover:bg-[#ebebeb] active:bg-[#fafafa] rounded-full transition-all duration-100'
          onClick={() => setStreaming(true)}
          >
          <CameraIcon width={20} height={20} />
        </div>
        {/* <div 
          className='p-0.5'
          style={{ borderBottom: tool === 'Pan' ? '2px solid #ff965b' : null}}
          onClick={() => {
            setTool('Pan');
          }}
          >
          <Pan width={25} height={25} />
        </div> */}
        { colors.map((color, index) => (
          <div 
            key={index}
            className='w-6 h-6 rounded-3xl stroke-white'
            style={{ 
              backgroundColor: color.color, 
              border: '2px solid white', 
              boxShadow: stroke === color.color ? '#ff965b 0px 0px 1px 3px' : null 
            }}
            onClick={() => {
              setStroke(color.color);
            }}
          >
          </div>
        ))}
      </div>
      { streaming && <VideoStreaming setStreaming={setStreaming} /> }
      <Configs /> 
    </>
  )
}

const Configs = () => {
  const [ open, setOpen ] = useState(false);
  const { colors, config, job, setJob, ws, response, sendToMachine, setProgress, progress } = useCom();
  const { canvas } = useCanvas();

  const uploadToMachine = async (gcode) => {
    const blob = new Blob([gcode.join('\n')], { type: 'text/plain '});
    const file = new File([blob], 'job.gcode', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress({ uploading: true, converting: false, progress: 80  });
      // await delay(500);

      const response =  await fetch(`http://${ config.url }/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log('Request Send Successfully :', data);

      sendToMachine(`[ESP220]/${file.name}`);

      setProgress({ uploading: false, converting: false, progress: 100  });
      setJob({ ...job, started:  true});
    } catch  (err) {
      console.log('Error While Uploading : ', err);
    }
  }

  const plot = async () => {
    setProgress({ uploading: false, converting: true, progress: 10 });
    setJob({ ...job, connected: true });

    const groupedObjects = await returnGroupedObjects(canvas);

    const svgElements = returnSvgElements(groupedObjects, canvas.getWidth(), canvas.getHeight());
    sortSvgElements(svgElements, colors);

    setProgress({ uploading: false, converting: true, progress: 40 });

    const gcodes = await convertToGcode(svgElements, colors, config);
    console.log('Gcode Generated : \n', gcodes.join('\n'))

    setProgress({ uploading: false, converting: true, progress: 80 });
    uploadToMachine(gcodes);
  }

  const textareaRef = useRef(null)

  useEffect(() => {
    if ( textareaRef.current ) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [response.message]);

  return (
    <>
      <div className='absolute right-8 top-7 z-10 overflow-hidden'>
        <div 
          className='flex justify-between items-center min-w-[15rem] rounded-md cursor-pointer'
          style={{ 
            backgroundColor: job.started ? '#0f4c7d' : '#095D6C',
            opacity: ws && job.connected ? '1': '0.6',
          }}
        >
          <div className='px-4 border-r border-[#ffffff3d] hover:border-[#6c36093d]' onClick={() => { setOpen(!open) }}>
            <ArrowUp width={20} height={20} style={{ rotate: open ? '' : '180deg'}} className={'transition-all duration-500'} />
          </div>
          <div className='group p-1 flex items-center gap-1 cursor-pointer rounded-md' >
            { !job.started ? (
              <>
                { progress.converting || progress.uploading ? (
                  <div className='w-full h-full flex items-center gap-1 '>
                    <p className='text-[#fff] text-sm px-9 font-bold tracking-wide'>Uploading...</p>
                    <div className='border bg-[#116d7e] group-hover:bg-[#116d7e] group-active:bg-[#1e5863] p-[10px] rounded-md border-[#1a6a79] transition-all duration-500'>
                      <Settings width={12} height={12} color={'#fff'} className={'animate-spin'} />
                    </div>
                  </div>
                ):(
                  <div className='w-full h-full flex items-center gap-1 ' onClick={() => { if ( ws && job.connected ) plot(); }}>
                    <p className='text-[#fff] text-sm px-9 font-bold tracking-wide'>{ ws && job.connected ? 'Print Now' : 'Connecting'}</p>
                    <div className='border bg-[#116d7e] group-hover:bg-[#116d7e] group-active:bg-[#1e5863] p-3 rounded-md border-[#1a6a79] transition-all duration-500'>
                      <ArrowLeft width={8} height={8} color={'#fff'} />
                    </div>
                  </div>
                )}
              </>
            ):(
              <>
                <p className='text-[#fff] text-sm px-4 font-bold tracking-wide'>Drawing..</p>
                <div 
                  className='p-3 bg-[#085da2] rounded-md transition-all duration-500 hover:bg-[#085da2] active:bg-[#1a4e79] focus:outline-none focus:ring focus:ring-[#0f4c7d] '
                  onClick={() => { 
                    sendToMachine(job.paused ? '~' : '!');
                    setJob({ ...job, paused: !job.paused });
                  }} 
                >
                  { job.paused ? (
                    <Resume width={8} height={8} />
                  ):(
                    <Pause width={8} height={8} />
                  )}
                </div>
                <div className='p-2 bg-[#085da2] rounded-md transition-all duration-500 hover:bg-[#085da2] active:bg-[#1a4e79] focus:outline-none focus:ring focus:ring-[#0f4c7d]'>
                  <p className='text-xs text-white'>{ job.percentage }%</p>
                </div>
              </>
            )}
          </div>
        </div>
        

        <div 
          className='machineMsg overflow-hidden transition-all rounded-md duration-500 border-[#095d6c3d] bg-white'
          style={{ 
            borderWidth: open ? '1px' : '',
            height: open ? '13rem' : '0rem',
            marginTop: open ? '0.75rem' : '0rem'
          }}
        >
          <div className='buttons'>
            <div className='p-3' onClick={() => { sendToMachine('$H') }}>
              <Home width={18} height={18} />
            </div>
            <div className='p-3' onClick={() => { sendToMachine('$X') }}>
              <Cross width={18} height={18} />
            </div>
            <div className='p-3' onClick={() => { sendToMachine('$Report/interval=50') }}>
              <Report width={18} height={18} />
            </div>
          </div>
          <textarea 
            ref={textareaRef} 
            value={ response.message } 
            className="cursor-default lg:pb-8" 
            readOnly
          ></textarea> 
        </div>
      </div>
    </>
  )
}

const useEditorSetup= ({stroke, tool, pan, setPan}) => {
  const { canvas } = useCanvas();

  useEffect(() => {
    if (!canvas) return;
    setPan(false)

    // canvas.getObjects().forEach(obj => {
    //   obj.set({
    //     selectable: false
    //   })
    // });
    
    if (tool === 'Pen') {
      canvas.getObjects().forEach(obj => {
        obj.set({
          selectable: false
        })
      });

      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = stroke;
      canvas.freeDrawingBrush.width = 3;

      return () => { 
        canvas.isDrawingMode = false; 
        canvas.getObjects().forEach(obj => {
          obj.set({
            selectable: true
          })
        });
      };
    } else if (tool === 'Eraser') {
      canvas.getObjects().forEach(obj => {
        obj.set({
          selectable: false
        })
      });
      canvas.selection = false;
      let isMouseDown = false;

      const handleEraser = (event) => {
        const pointer = canvas.getPointer(event.e);
        const target = canvas.findTarget(pointer, true)
        if (target) {
          console.log('Object is Intersecting :: ', target);
          if (target.name !== 'ToolHead') {
            canvas.remove(target);
            canvas.renderAll();
          }
        }
      }

      canvas.on('mouse:down', () => { isMouseDown = true });
      canvas.on('mouse:up', () => { isMouseDown = false })
      canvas.on('mouse:move', (event) => {
        if (isMouseDown) {
          handleEraser(event)
        }
      });
      return () => { 
        canvas.off('mouse:move', handleEraser) ;
        canvas.off('mouse:up');
        canvas.off('mouse:down');
        canvas.getObjects().forEach(obj => {
          obj.set({
            selectable: true
          })
        });
      };

    } else {
      canvas.selection = true;
      setPan(true);
    }

    canvas.renderAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, tool, stroke, pan]);


  useEffect(() => {
    if (!canvas) return;

    canvas.getActiveObjects().forEach(obj => {
      obj.set({
        stroke: stroke
      })
    })
    canvas.renderAll()
  }, [canvas, stroke])
}

const VideoStreaming = ({ setStreaming }) => {
  const videoRef = useRef(null);
  const { canvas } = useCanvas()

  useEffect(() => {
    const startStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    }
    startStream()

    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  }, [])

  const handleCapture = () => {
    const video = videoRef.current;
    const drawingCanvas = document.createElement('canvas');
    drawingCanvas.width = video.videoWidth;
    drawingCanvas.height = video.videoHeight;
    const ctx = drawingCanvas.getContext('2d');
    ctx.drawImage(video, 0,0, drawingCanvas.width, drawingCanvas.height);
    const dataUrl = drawingCanvas.toDataURL('image/png');

    FabricImage.fromURL(dataUrl).then((img) => {
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      ); 

      img.set({
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();
    })
  }



  return (
    <>
      <div className='fixed bg-[#0000002d] backdrop-blur-sm w-dvw h-dvh z-10'></div>
      <div className='absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10'>
        <div className='flex justify-between items-center rounded-tl-md rounded-tr-md pl-3 pr-2.5 pt-2 bg-white'>
          <p className='text-sm'>Canvas Background</p>
          <button 
            onClick={() => setStreaming(false)}>
            <CloseIcon stroke={'#ff4545'} strokeWidth={2} width={17} height={17} />
          </button>
        </div>
        <div className="p-3 bg-white text-center rounded-bl-md rounded-br-md">
          <video 
            className='rounded'
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%' }} />
          <button 
            className='bg-teal-500 flex justify-center items-center gap-1 px-2 py-1 text-sm font-medium tracking-wide text-white mx-auto rounded mt-2 mb-3'
            onClick={handleCapture}>
            <CameraIcon stroke={'#ffffff'} strokeWidth={2} width={17} height={17} />
            Take Picture
          </button>
        </div>
      </div>
    </>
  )
}