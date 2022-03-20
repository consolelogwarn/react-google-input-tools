import './App.css';
import InputTools from './components/InputTools/InputTools';
import { LANGUAGE_CODE } from './components/InputTools/InputTools';


function App() {

  const onChange = (value: string) => {
    console.log('onchange', value);
  }

  return (
    <div className="App">
      <InputTools 
        onChangeCallback={onChange}
        destLang={LANGUAGE_CODE.HINDI}
      />
    </div>
  );
}

export default App;
