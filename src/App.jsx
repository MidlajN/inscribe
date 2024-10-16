import './App.css'
import { Logo, Pen, Eraser, ArrowLeft, Pan } from './icons'
import useCanvas, { useCom } from './context'
import { useEffect, useState } from 'react';
import { PencilBrush } from 'fabric';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { convertToGcode, returnGroupedObjects, returnSvgElements, sortSvgElements } from './convert';


function App() { 
  const { canvasRef } = useCanvas();
  const [ pan, setPan ] = useState(false);

  return (
    <>
      <div className='flex flex-col bg-slate-100 h-screen overflow-hidden'>
      
        {/* ---------- Navbar ---------- */}
        <section className='navbar z-50'>
          <Logo width={138} height={32}/>
          <SetUp pan={pan} setPan={setPan} />
        </section>

        
        {/*  ---------- Canvas ---------- */}
        <section 
          className='canvas-container' 
        >
          <TransformWrapper
            // initialScale={0.6} 
            maxScale={1}
            minScale={.3} 
            limitToBounds={ !pan }
            panning={{ excluded: ['fabricCanvas'] }}
            centerOnInit 
            centerZoomedOut={false}
            // disablePadding
            // disabled={!twoFingerMode}
          >
            <TransformComponent
              contentStyle={{ 
                // display: 'flex',
                margin: '1rem' 
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
    </>
  )
}

// eslint-disable-next-line react/prop-types
function SetUp({ pan, setPan }) {
  const { colors, config } = useCom();
  const { canvas } = useCanvas();

  const [ stroke, setStroke ] = useState('#000000');
  const [ tool, setTool ] = useState('Pen');

  useEffect(() => {
    if (!canvas) return;
    
    // canvas.getObjects().forEach(obj => {
    //   obj.set({
    //     selectable: false
    //   });
    // });

    if (tool === 'Pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = stroke;
      canvas.freeDrawingBrush.width = 3;

      return () => { 
        canvas.isDrawingMode = false; 
      };
    }

    console.log('Pan :: ', pan);
    
    if (tool === 'Pan') {
      setPan(true);
    } else {
      setPan(false);
    }

  }, [canvas, setPan, stroke, tool]);

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
      {/* <section className='relative lg:w-full max-w-[1280px] m-auto'> */}
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
          className='bg-[#0E505C] w-fit flex items-center justify-between gap-4 rounded-full' 
          onClick={plot}
        >
          <p className='text-white text-sm font-bold indent-5 tracking-wide'>Print Now</p>
          <div className='bg-[#095D6C] p-3 rounded-r-full hover:rounded-full transition-all duration-500'>
            <ArrowLeft width={8} height={8} />
          </div>
        </div>
      {/* </section> */}
    </>
  )
}

export default App