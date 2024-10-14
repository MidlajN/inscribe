import './App.css'
import { Logo, Pen, Eraser, ArrowLeft } from './icons'
import useCanvas, { useCom } from './context'
import { useEffect, useState } from 'react';
import { PencilBrush } from 'fabric';



function App() { 
  const { canvasRef } = useCanvas();

  return (
    <>
      <div className='flex flex-col h-screen'>
      
        {/* ---------- Navbar ---------- */}
        <section className='navbar'>
          <Logo width={138} height={32}/>
        </section>

        {/*  ---------- Tools ---------- */}
        <SetUp />

        {/*  ---------- Canvas ---------- */}
        <section className='p-4 bg-slate-100 flex-1'>
          <div className='w-fit shadow-lg m-auto border'>
            <canvas ref={canvasRef}></canvas>
          </div>
        </section>
      </div>
    </>
  )
}

function SetUp() {
  const { colors } = useCom();
  const { canvas } = useCanvas();

  const [ stroke, setStroke ] = useState('#000000');
  const [ tool, setTool ] = useState('Pen');

  useEffect(() => {
    if (!canvas) return;
    
    canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: false
      });
    });

    if (tool === 'Pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = stroke;
      canvas.freeDrawingBrush.width = 3;

      return () => { 
        canvas.isDrawingMode = false; 
      };
    }
  }, [canvas, stroke, tool]);

  return (
    <>
      <section className='border-b relative max-w-[1280px]'>
        <div className='flex justify-center items-center gap-4 p-3'>
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

        <div className='bg-[#0E505C] w-fit flex items-center justify-between gap-4 rounded-full absolute right-5 top-3'>
          <p className='text-white text-sm font-bold indent-5 tracking-wide'>Print Now</p>
          <div className='bg-[#095D6C] p-3 rounded-r-full hover:rounded-full transition-all duration-500'>
            <ArrowLeft width={8} height={8} />
          </div>
        </div>
      </section>
    </>
  )
}

export default App
