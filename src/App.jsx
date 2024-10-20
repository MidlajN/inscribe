import './App.css'
import { Logo, Pen, Eraser, ArrowLeft, Pan, ArrowUp, Home, Cross, Report } from './icons'
import useCanvas, { useCom } from './context'
import { useEffect, useState , useRef } from 'react';
import { PencilBrush,  } from 'fabric';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { convertToGcode, returnGroupedObjects, returnSvgElements, sortSvgElements } from './convert';

function App() { 
  const { canvasRef } = useCanvas();
  const { job } = useCom();
  const [ pan, setPan ] = useState(false);

  return (
    <>
      <div className='flex flex-col h-screen overflow-hidden'>
      
        {/* ---------- Navbar ---------- */}
        <div className='bg-white px-4 py-[0.65rem] rounded-xl flex items-end absolute left-4 top-5 z-10'>
          <Logo width={138} height={35}/>
          <p>{}</p>
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
            panning={{ excluded: ['fabricCanvas'] }}
            centerOnInit 
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

  const [ stroke, setStroke ] = useState('#5e5e5e');
  const [ tool, setTool ] = useState('Pen');

  useEditorSetup({ 
    stroke: stroke,
    tool: tool,
    pan: pan,
    setPan: setPan
  });

  useEffect(() => { 
    if (ws) return;
    if (!job.connected) {
      console.log('Not Connected :: connecting....', job)
      openSocket()
    }
  }, [ws, job, openSocket])


  return (
    <>
      <div className='setup'>
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
          className='p-0.5'
          style={{ borderBottom: tool === 'Pan' ? '2px solid #ff965b' : null}}
          onClick={() => {
            setTool('Pan');
          }}
          >
          <Pan width={25} height={25} />
        </div>
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

      {/* <div 
        className='group bg-[#0E505C] w-fit flex items-center justify-between gap-4 rounded-full absolute right-8 top-9 z-10 cursor-pointer ' 
        onClick={() => { if (ws) plot() }}
      >
        <p className='text-white text-sm font-bold indent-5 tracking-wide'>Print Now</p>
        <div className='bg-[#095D6C] p-3 rounded-r-full group-hover:rounded-full transition-all duration-500'>
          <ArrowLeft width={8} height={8} />
        </div>
      </div> */}
      <Configs /> 
    </>
  )
}

const Configs = () => {
  const [ open, setOpen ] = useState(true);
  const { colors, config, job, setJob, ws, response, sendToMachine } = useCom();
  const { canvas } = useCanvas();

  const uploadToMachine = async (gcode) => {
    const blob = new Blob([gcode.join('\n')], { type: 'text/plain '});
    const file = new File([blob], 'job.gcode', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response =  await fetch(`http://${ config.url }/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log('Request Send Successfully :', data);

      sendToMachine(`[ESP220]/${file.name}`);
      setJob({ ...job, started:  true});
    } catch  (err) {
      console.log('Error While Uploading : ', err);
    }
  }

  const plot = async () => {
    const groupedObjects = returnGroupedObjects(canvas);
    const svgElements = returnSvgElements(groupedObjects, canvas.getWidth(), canvas.getHeight());
    sortSvgElements(svgElements, colors);
    console.log(svgElements);

    const gcodes = await convertToGcode(svgElements, colors, config);
    console.log('Generated G-Code : ', gcodes.join('\n'));

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
        <div className='flex justify-between items-center min-w-[15rem] bg-[#095D6C] rounded-md'>
          <div className='px-4 border-r border-[#ffffff3d] hover:border-[#6c36093d] cursor-pointer' onClick={() => { setOpen(!open) }}>
            <ArrowUp width={20} height={20} style={{ rotate: open ? '' : '180deg'}} className={'transition-all duration-500'} />
          </div>
          <div 
            className='group p-1 flex items-center justify-between gap-4 cursor-pointer bg-[#095D6C] rounded-md' 
            onClick={() => { if (ws) plot(); }}
          >
            <p className='text-[#fff] text-sm px-4 font-bold indent-5 tracking-wide'>Print Now</p>
            <div className='border bg-[#116d7e] p-3 rounded-md border-[#1a6a79] transition-all duration-500'>
              <ArrowLeft width={8} height={8} color={'#fff'} />
            </div>
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

    canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: pan
      })
    });
    
    if (tool === 'Pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = stroke;
      canvas.freeDrawingBrush.width = 3;

      return () => { 
        canvas.isDrawingMode = false; 
      };
    } else if (tool === 'Eraser') {
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