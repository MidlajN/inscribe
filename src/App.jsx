import './App.css'
import { Logo, Pen, Eraser, ArrowLeft, Pan } from './icons'
import useCanvas, { useCom } from './context'
import { useEffect, useState } from 'react';
import { PencilBrush,  } from 'fabric';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { convertToGcode, returnGroupedObjects, returnSvgElements, sortSvgElements } from './convert';

function App() { 
  const { canvasRef } = useCanvas();
  const { job } = useCom()
  const [ pan, setPan ] = useState(false);

  return (
    <>
      <div className='flex flex-col h-screen overflow-hidden'>
      
        {/* ---------- Navbar ---------- */}
        {/* <section className='navbar z-50'> */}
          <div className='bg-white px-4 py-[0.65rem] rounded-xl flex items-end absolute left-4 top-5 z-10'>
            <Logo width={138} height={35}/>
          </div>
          <SetUp pan={pan} setPan={setPan} />
          {/* <SetUp /> */}
        {/* </section> */}

        
        {/*  ---------- Canvas ---------- */}
        <section 
          className='canvas-container' 
        >
          <TransformWrapper
            initialScale={0.75} 
            maxScale={1}
            minScale={.3} 
            // limitToBounds={ !pan }
            panning={{ excluded: ['fabricCanvas'] }}
            centerOnInit 
            // centerZoomedOut={false}
            // disablePadding
            disabled={ !pan }
          >
            <TransformComponent
              contentStyle={{ 
                // display: 'flex',
                // margin: '1rem' 
              }} 
              wrapperStyle={{  
                width: '100dvw',
                height: '100dvh',
                overflow:'visible', 
                // display:'flex', 
                // left:'8vw', 
              }}
            >
              <div className=' w-full h-full shadow-lg m-auto border'>
                <canvas ref={ canvasRef } className="fabricCanvas"></canvas>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </section>
      </div>

      <div className='w-52 absolute z-20 bottom-6 right-8 px-4 py-2 border rounded-full flex justify-center items-center gap-3'>
        <div className="w-[80%] bg-gray-200 rounded-full h-1 overflow-hidden">
          <div 
              className="h-full transition-all duration-500" 
              style={{ width: `40%`, background: '#095D6C' }}
          />
        </div>
        <p className='text-xs font-medium text-[#062f36]'>98%</p>
      </div>
    </>
  )
}

export default App



// eslint-disable-next-line react/prop-types
function SetUp({ pan, setPan }) {
  const { colors, config, openSocket, job, setResponse, setJob, sendToMachine } = useCom();
  const { canvas } = useCanvas();

  const [ stroke, setStroke ] = useState('#000000');
  const [ tool, setTool ] = useState('Pen');

  useEditorSetup({ 
    stroke: stroke,
    tool: tool,
    pan: pan,
    setPan: setPan
  });

  useEffect(() => { 
    if (!canvas) return;
    setResponse({ pageId: 1, message: ''})
    if (!job.connected) {
      console.log('Not Connected :: connecting....', job)
      openSocket() 
    }
  }, [canvas])

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

    const gcodes = await convertToGcode(svgElements, colors, config);
    console.log('Generated G-Code : ', gcodes.join('\n'));

    uploadToMachine(gcodes);
  }

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

      <div 
        className='bg-[#0E505C] w-fit flex items-center justify-between gap-4 rounded-full absolute right-8 top-9 z-10' 
        onClick={plot}
      >
        <p className='text-white text-sm font-bold indent-5 tracking-wide'>Print Now</p>
        <div className='bg-[#095D6C] p-3 rounded-r-full hover:rounded-full transition-all duration-500'>
          <ArrowLeft width={8} height={8} />
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

      canvas.on('mouse:move', handleEraser);
      canvas.on('mouse:down',  handleEraser);
      return () => {
        canvas.off('mouse:move', handleEraser);
        canvas.off('mouse:down', handleEraser)
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