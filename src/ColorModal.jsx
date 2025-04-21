/* eslint-disable react/prop-types */
// import useCanvas from "../../context/CanvasContext";
// import useCom from "../../context/ComContext";
import { useEffect, useState } from "react";
// import { AnimatePresence, motion } from "framer-motion";
// import { PenIcon } from "../Icons";
import { SketchPicker } from "react-color";
// import { Oval } from "react-loader-spinner";
// import { 

//     CompletedCheck 
// } from "./Icons";
// import { XMark } from "../plotter/Icons";
import useCanvas, { useCom } from "./context";
import { CloseIcon } from "./icons";



export const ManageColors = ({ isOpen, setIsOpen }) => {
    const { colors, setColors } = useCom();
    const { canvas } = useCanvas();
    const [ displayPalette, setDisplayPalettte ] = useState({ open: false, index: null });
    const [ tempColors, setTempColors ] = useState([...colors]);


    useEffect(() => {
        setTempColors([...colors])
    }, [colors])

    const updateColor = (index, newColor) => {
        const oldColor = colors[index].color;

        canvas.getObjects().forEach(obj => {
            if (obj.get('stroke') === oldColor) {
                obj.set({ stroke: newColor.hex });
            }
        });
        canvas.renderAll();

        const updatedColors = colors.map((color, i) => (
            i === index ? { ...color, color: newColor.hex } : color
        ));
        setColors(updatedColors)
    }



    const togglePopup = () => {
        setIsOpen(!isOpen);
        setDisplayPalettte({ open: false, index: null });
    }

    return (
        <>
            { isOpen && (
                <div
                    className="absolute right-5 top-16 w-fit min-w-80 bg-white rounded-xl shadow-lg border "
                    onClick={(e) => e.stopPropagation()} // Prevent closing on popup click
                >
                    <div className="flex justify-end items-centerborder-b "> 
                        <button className="p-3 rounded-tr-xl bg-gray-50 hover:bg-gray-100 transition-all duration-300 active:bg-gray-300" onClick={togglePopup}> 
                            <CloseIcon width={15} height={15} strokeWidth={2} color={'#000000'} />
                        </button>
                    </div>
                    <div className="colorManager">
                        { tempColors.map((color, index) => (
                            <div key={index} className="item flex justify-between items-center px-4 py-3 relative border-b" >
                                {/* <PenIcon stroke={ color.color } width={33} height={20} /> */}
                                <p className="text-xs py-2">
                                    <span className="p-2 bg-slate-100 rounded px-3">{ index + 1 }</span>
                                    <span className="px-2 font-medium">{ color.color }</span> 
                                </p>
                                <div className="w-7 h-7 rounded-lg  border shadow" style={{ background: color.color }} onClick={() => setDisplayPalettte({ open: true, index: index })}></div>
                                { displayPalette.open && index === displayPalette.index &&
                                    <>
                                        <div className="absolute z-[2] top-1/2 -right-full -translate-x-[40%]  flex" onClick={() => setDisplayPalettte({ open: false, index: null })}>
                                            <div className="w-fit h-fit ml-auto p-1 border bg-red-500 rounded mr-1 cursor-pointer">
                                                <CloseIcon stroke={'#ffffff'} strokeWidth={3} width={17} height={17} />
                                            </div>
                                            <SketchPicker  
                                                className="border-none shadow-none drop-shadow-none"
                                                color={ color.color } 
                                                onChange={ (clr) => updateColor( index, clr )} 
                                            />
                                        </div>
                                    </>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}