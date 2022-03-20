import React, { ChangeEvent, KeyboardEvent, useEffect, useState } from "react";
import debounce from 'lodash/debounce';
import './InputTools.css';

const getCaretCoordinates = require('textarea-caret');

export enum LANGUAGE_CODE {
    ENGLISH = 'en',
    AMHARIC = 'am',
    ARABIC = 'ar',
    BENGALI = 'bn',
    CHINESE = 'zh',
    GREEK = 'el',
    GUJARATI = 'gu',
    HINDI = 'hi',
    KANNADA = 'kn',
    MALAYALAM = 'ml',
    MARATHI = 'mr',
    NEPALI = 'ne',
    ORIYA = 'or',
    PERSIAN = 'fa',
    PUNJABI = 'pa',
    RUSSIAN = 'ru',
    SANSKRIT = 'sa',
    SINHALESE = 'si',
    SERBIAN = 'sr',
    TAMIL = 'ta',
    TELUGU = 'te',
    TIGRINYA = 'ti',
    URDU = 'ur'
}

export interface InputToolsProps {
    destLang: LANGUAGE_CODE;
    disabled?: boolean;
    mainContainerStyle?: {[k:string]: string};
    textAreaStyle?: {[k:string]: string};
    suggestionDivStyle?: {[k:string]: string};
    suggestionSpanStyle?: {[k:string]: string};
    suggestionUlStyle?: {[k:string]: string};
    suggestionLiStyle?: {[k:string]: string};
    onChangeCallback: (value: string) => void;
}


// check if a string in alphanumeric 
const isAplhaNumeric = (val: string):boolean => {
    return /^[A-Za-z0-9]$/.test(val);
}

const MAX_SUGGESTIONS = 5;
const DISPLAY_NONE = 'none';
const DISPLAY_BLOCK = 'block';
const LINE_HEIGHT = 20;
const DEBOUNCE_INTERVAL = 150;



const InputTools = (props: InputToolsProps)=> {
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState('');
    const [typedWord, setTypedWord] = useState('');
    const [leftPos, setLeftPos] = useState(4);
    const [topPos, setTopPos] = useState(4);
    const [suggestion, setSuggestion] = useState<string[]>([]);
    const [showSuggestion, setShowSuggestion] = useState(DISPLAY_NONE);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(1);
    const disabled = props.disabled || false;
    const metaKey = React.useRef(false);
    const {destLang, onChangeCallback} = props;

    // created the debouncedSearch callback with help of useRef
    // so that the same function is persisted across render
    const debouncedSearch = React.useRef(debounce(async (word: string)=> {
        if(!word) {
            return;
        }
        // Google Input tools API URL
        const url = `https://inputtools.google.com/request?text=${word}&itc=${destLang}-t-i0-und&num=${MAX_SUGGESTIONS}&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
        const res = await fetch(url, {method: 'POST'});
        const data = await res.json();
        // return if incomplete response received
        if(!Array.isArray(data) || 
            data.length < 2 || 
            data[0] !== 'SUCCESS' || 
            !Array.isArray(data[1]) || 
            data[1].length < 1) {
            return;
        }
        const dataRes = data[1][0];
        if(!Array.isArray(dataRes) || dataRes.length < 2) {
            return;
        }
        const suggestions = [...dataRes[1], dataRes[0]];
        setSuggestion(suggestions);
    }, DEBOUNCE_INTERVAL )).current;


    // search for suggestion when typedWord changes
    // call debouncedSearch function
    useEffect(() => {
        if(typedWord){
            debouncedSearch(typedWord);
        }
        // cancel any pending debounced search when component unmounts
        return(()=> {
            debouncedSearch.cancel();
        });
    }, [typedWord, debouncedSearch]);

    // call the callback function when value changes 
    useEffect(() => {
        onChangeCallback(value);
    }, [onChangeCallback, value]);

    // update the floating div position based on the value in the text area
    useEffect(() => {
        if(textAreaRef.current){
            const caretPos = getCaretCoordinates(textAreaRef.current, cursorPosition);
            setLeftPos(Math.min(caretPos.left, textAreaRef.current.clientWidth * 0.9));
            setTopPos(caretPos.top + LINE_HEIGHT);
        }
    },[cursorPosition, value]);

    // keep the cursor position 
    // when editing in between lines
    // React re render causes the cursor to move to the end of the line
    useEffect(() => {
        if(textAreaRef.current){
            textAreaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
    }, [cursorPosition, textAreaRef, value, typedWord]);


    // keep track of the MetaKey to allow CTRL+C, CTRL+V
    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if(event.metaKey) {
            console.log('metaKey down');
            metaKey.current = true;
        }
    }

    // handle key press 
    const handleNonAlphaKeyPress = (key: string) => {
        switch(key) {
            case 'ArrowDown':
                setSelectedSuggestion(prev => prev < suggestion.length - 1 ? prev + 1 : prev );
                break;
            
            case 'ArrowUp':
                setSelectedSuggestion(prev => prev > 0 ? prev - 1 : prev );
                break;

            case 'Enter': 
                selectSuggestion(selectedSuggestion);
                break;
            
            case ' ':
                selectSuggestion(selectedSuggestion);
                break;
            
            case 'Backspace':
                if(typedWord){
                    setTypedWord(prev => prev ? prev.slice(0, -1) : prev);
                } else {
                    clearSuggestion();
                }
                break;
            default:
                console.log('Ignored key:', key);
        }
    }

    // onKeyUp handler function
    const onKeyUp = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
        // reset metaKey 
        console.log('onKeyUp', event.key);
        console.log('onKeyUp', event.currentTarget.selectionEnd, cursorPosition);
        if(event.metaKey || event.key === 'Meta'){
            // setTimeout used to correctly capture the behaviour of CTRL + V 
            setTimeout(()=> { metaKey.current = false }, 100);
            return;
        }
        
        // ignore all keys when meta key is pressed 
        if(metaKey.current){
            console.log('metaKey.current', metaKey.current);
            return;
        }
        
        if(isAplhaNumeric(event.key)){
            setShowSuggestion(DISPLAY_BLOCK);
            setTypedWord(prev => prev + event.key);
            return;
        }

        // when non alpha numeric key pressed 
        if(showSuggestion === DISPLAY_NONE){
            return;
        }

        // handle other non alphanumeric key presses
        handleNonAlphaKeyPress(event.key);
    }

    // select the suggestion value and append to text area
    const selectSuggestion = (idx: number) => {
        const selectedValue = suggestion[idx];
        const leftValue = value.substring(0, cursorPosition);
        const rightValue = value.substring(cursorPosition, value.length);
        if(selectedValue){
            setValue(`${leftValue}${selectedValue} ${rightValue}`);
            setCursorPosition(prev => prev + selectedValue.length + 1);
        }
        clearSuggestion();
    }

    // clear suggestion box
    const clearSuggestion = ()=> {
        setTypedWord('');
        setSuggestion([]);
        setSelectedSuggestion(0);
        setShowSuggestion('none');
        metaKey.current = false;
    }



    // onChange handler for the text area
    const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        console.log(event.target.selectionEnd, cursorPosition);
        // when suggestion list is showing 
        // ignore the onchange value
        // user must select from the suggestion list
        if(showSuggestion === DISPLAY_BLOCK){
            return;
        }

        const {selectionStart, value} = event.target;
        const lastChar = value.substring(0, selectionStart).slice(-1);
        if(isAplhaNumeric(lastChar)){
            setCursorPosition(event.target.selectionEnd - 1);
            return;
        }
        
        setCursorPosition(event.target.selectionEnd);
        setValue(event.target.value);
    }

    return (
        <div className="main-container" style={props.mainContainerStyle || {}}>
            <textarea 
                ref={textAreaRef}
                className="txtarea-cls"
                style={props.textAreaStyle || {}}
                onChange={onChange}
                onKeyUp={onKeyUp}
                onKeyDown={onKeyDown}
                disabled={disabled}
                value={value}>
            </textarea>
            <div 
                className="floating" 
                style={{left: leftPos, top: topPos, display: showSuggestion, ...props.suggestionDivStyle}}
            >
                <span style={props.suggestionSpanStyle}>{typedWord}</span>
                <span className="blink">|</span>
                    <ul style={props.suggestionUlStyle}>
                        {suggestion.map((el: any, idx: number) => (
                        <li 
                            className={idx === selectedSuggestion ? 'selected': ''}
                            style={props.suggestionLiStyle}
                            onClick={()=>selectSuggestion(idx)}
                            key={idx}>
                            {el}
                        </li>
                        ))}
                    </ul>
            </div>
        </div>
    );
}


export default InputTools;