import PropTypes from 'prop-types';
import React from 'react';
import download from '../helpers/download';

// batch skeleton
import batch_init from '../batch_templates/init.txt';
import batch_closure from '../batch_templates/closure.txt';
import batch_client from '../batch_templates/client.txt';
import batch_clientUnique from '../batch_templates/clientUniqueArch.txt';
import batch_designer from '../batch_templates/designer.txt';
import batch_designerUnique from '../batch_templates/designerUniqueArch.txt';
import batch_iti from '../batch_templates/iti.txt';
import batch_rtam from '../batch_templates/rtam.txt';
import batch_hotfixes from '../batch_templates/hotfixes.txt';
import batch_hotfixesUnique from '../batch_templates/hotfixesUniqueArch.txt';

// client properties
const six_four_props = require('../client_properties/properties.6.4.json');
const six_five_props = require('../client_properties/properties.6.5.json');
const six_six_props = require('../client_properties/properties.6.6.json');
const six_seven_props = require('../client_properties/properties.6.7.json');
const seven_zero_props = require('../client_properties/properties.7.0.json');
const seven_zero_one_props = require('../client_properties/properties.7.1.json');

require('formdata-polyfill');

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function jump(h) {
  const top = document.getElementById(h).offsetTop;

  setTimeout(() => {
    window.scrollTo(0, top);
  }, 100);
}

class Properties extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      properties: {
        Designer: [],
        Client: [],
        ITI: [],
        RTAM: [],
      },
      version: props.version,
      software: props.software,
      include_iti: props.include_iti,
      include_rtam: props.include_rtam,
      architecture: props.architecture,
      msi: props.msi,
      msi64: props.msi64,
      iti: props.iti,
      rtam: props.rtam,
      include_hotfixes: props.include_hotfixes,
      batchTemplate: {
        init: batch_init,
        closure: batch_closure,
        client: batch_client,
        clientUnique: batch_clientUnique,
        designer: batch_designer,
        designerUnique: batch_designerUnique,
        iti: batch_iti,
        rtam: batch_rtam,
        hotfixes: batch_hotfixes,
        hotfixesUnique: batch_hotfixesUnique,
      },
      batchScript: false,
      hotfixes: [{ id: 1, value: '' }],
      showClientProperties: true,
      showITIProperties: true,
      showRTAMProperties: true,
      searchSoftwareFilter: '',
      searchITIFilter: '',
      searchRTAMFilter: '',
    };
  }

  // Initial data mount
  componentDidMount() {
    switch (this.state.version) {
      case '6.4':
        this.setState({ properties: six_four_props });
        break;

      case '6.5':
        this.setState({ properties: six_five_props });
        break;

      case '6.6':
        this.setState({ properties: six_six_props });
        break;

      case '6.7':
        this.setState({ properties: six_seven_props });
        break;

      case '7.0':
        this.setState({ properties: seven_zero_props });
        break;
		
      case '7.1':
          this.setState({ properties: seven_zero_one_props });
          break;

      default:
        this.setState({ properties: seven_zero_one_props });
        break;
    }
  }

  handleSubmit = e => {
    e.preventDefault();

    let formData = new FormData(e.target);

    const formObject = {};

    formObject[this.state.software] = [];

    if (this.state.include_iti) formObject.ITI = [];

    if (this.state.include_rtam) formObject.RTAM = [];

    formData = Array.from(formData);
    formData.forEach(value => {
      const regex = /\[(.*?)\]/g; // gets whats between square brackets
      const match = regex.exec(value[0]);
      const inputValue = value[1];

      if (match) {
        const property = match[1];
        const type = value[0].replace(match[0], '');

        formObject[type].push({
          property,
          value: inputValue,
        });
      }
    });

    this.generateBatch(formObject);
  };

  generateBatch = formValues => {
    let batchSoftwareProperties = '';
    let softwareBatch = null;
    let batchITIProperties = null;
    let batchRTAMProperties = null;
    let batchScript = batch_init;

    // Client / Designer properties
    for (let i = 0; i < formValues[this.state.software].length; i++) {
      const formProperty = formValues[this.state.software][i].property;
      const formValue = formValues[this.state.software][i].value;

      const sourceProperty = this.state.properties[this.state.software].find(
        element => element.property === formProperty,
      );

      // checks if there was a change from default value
      if (sourceProperty.control.default !== formValue) {
        batchSoftwareProperties += `${formProperty}="${formValue}" `;
      }
    }

    batchSoftwareProperties = batchSoftwareProperties.trim();

    // ITI properties
    if (this.state.include_iti) {
      batchITIProperties = '';

      for (let i = 0; i < formValues.ITI.length; i++) {
        const formProperty = formValues.ITI[i].property;
        const formValue = formValues.ITI[i].value;

        const sourceProperty = this.state.properties.ITI.find(
          element => element.property === formProperty,
        );

        // checks if there was a change from default value
        if (sourceProperty.control.default !== formValue) {
          batchITIProperties += `${formProperty}="${formValue}" `;
        }
      }

      batchITIProperties = batchITIProperties.trim();
    }

    // RTAM properties
    if (this.state.include_rtam) {
      batchRTAMProperties = '';

      for (let i = 0; i < formValues.RTAM.length; i++) {
        const formProperty = formValues.RTAM[i].property;
        const formValue = formValues.RTAM[i].value;

        const sourceProperty = this.state.properties.RTAM.find(
          element => element.property === formProperty,
        );

        // checks if there was a change from default value
        if (sourceProperty.control.default !== formValue) {
          batchRTAMProperties += `${formProperty}="${formValue}" `;
        }
      }

      batchRTAMProperties = batchRTAMProperties.trim();
    }

    // Software batch preparation
    if (this.state.software === 'Client') {
      softwareBatch =
        this.state.architecture === '6432'
          ? this.state.batchTemplate.client
          : this.state.batchTemplate.clientUnique;
    } else {
      softwareBatch =
        this.state.architecture === '6432'
          ? this.state.batchTemplate.designer
          : this.state.batchTemplate.designerUnique;
    }

    if (this.state.architecture === '6432') {
      softwareBatch = softwareBatch.replace('{msi}', this.state.msi);
      softwareBatch = replaceAll(softwareBatch, '{msi64}', this.state.msi64);
    }

    if (this.state.architecture === '64') {
      softwareBatch = replaceAll(softwareBatch, '{msi}', this.state.msi64);
    }

    if (this.state.architecture === '32') {
      softwareBatch = replaceAll(softwareBatch, '{msi}', this.state.msi);
    }

    softwareBatch = softwareBatch.replace(
      '{properties}',
      batchSoftwareProperties,
    );

    batchScript += softwareBatch;

    // ITI batch preparation
    if (this.state.include_iti) {
      let itiBatch = this.state.batchTemplate.iti;

      itiBatch = itiBatch.replace('{msi}', this.state.iti);
      itiBatch = itiBatch.replace('{properties}', batchITIProperties);

      batchScript += `\n\n${itiBatch}`;
    }

    // RTAM batch preparation
    if (this.state.include_rtam) {
      let rtamBatch = this.state.batchTemplate.rtam;

      rtamBatch = rtamBatch.replace('{msi}', this.state.rtam);
      rtamBatch = rtamBatch.replace('{properties}', batchRTAMProperties);

      batchScript += `\n\n${rtamBatch}`;
    }

    if (this.state.include_hotfixes === false) {
      batchScript += '\n\ngoto :success';
    } else {
      // Include HotFixes

      if (this.state.architecture === '6432') {
        batchScript += `\n\n${this.state.batchTemplate.hotfixes}`;

        const { software } = this.state;

        // 32 BITs Hotfixes
        batchScript += '\n\n:x86';
        batchScript += '\nrem Applies patch to x86 Windows Operating System';

        for (let i = 0; i < this.state.hotfixes.length; i++) {
          const fileName = this.state.hotfixes[i].value;

          batchScript += `\n\necho Copying file ${fileName} to C:\\Program Files\\NICE Systems\\Real-Time ${software}\\`;
          batchScript += `\nxcopy  ".\\Hotfixes\\${fileName}" "C:\\Program Files\\NICE Systems\\Real-Time ${software}\\*" /y`;
        }

        batchScript += '\ngoto :success';

        // 64 BITs Hotfixes
        batchScript += '\n\n:x64';
        batchScript += '\nrem Applies patch to x64 Windows Operating System';

        for (let i = 0; i < this.state.hotfixes.length; i++) {
          const fileName = this.state.hotfixes[i].value;

          batchScript += `\n\necho Copying file ${fileName} to C:\\Program Files (x86)\\NICE Systems\\Real-Time ${software}\\`;
          batchScript += `\nxcopy  ".\\Hotfixes\\${fileName}" "C:\\Program Files (x86)\\NICE Systems\\Real-Time ${software}\\*" /y`;
        }

        batchScript += '\ngoto :success';
      } // end 6432

      if (this.state.architecture === '32') {
        batchScript += `\n\n${this.state.batchTemplate.hotfixesUnique}`;

        const { software } = this.state;

        // 32 BITs Hotfixes
        batchScript += '\n\n:ApplyHotfixes';
        batchScript += '\nrem Applies patch to x86 Windows Operating System';

        for (let i = 0; i < this.state.hotfixes.length; i++) {
          const fileName = this.state.hotfixes[i].value;

          batchScript += `\n\necho Copying file ${fileName} to C:\\Program Files\\NICE Systems\\Real-Time ${software}\\`;
          batchScript += `\nxcopy  ".\\Hotfixes\\${fileName}" "C:\\Program Files\\NICE Systems\\Real-Time ${software}\\*" /y`;
        }

        batchScript += '\ngoto :success';
      } // end 32

      if (this.state.architecture === '64') {
        batchScript += `\n\n${this.state.batchTemplate.hotfixesUnique}`;

        const { software } = this.state;

        // 64 BITs Hotfixes
        batchScript += '\n\n:ApplyHotfixes';
        batchScript += '\nrem Applies patch to x64 Windows Operating System';

        for (let i = 0; i < this.state.hotfixes.length; i++) {
          const fileName = this.state.hotfixes[i].value;

          batchScript += `\n\necho Copying file ${fileName} to C:\\Program Files (x86)\\NICE Systems\\Real-Time ${software}\\`;
          batchScript += `\nxcopy  ".\\Hotfixes\\${fileName}" "C:\\Program Files (x86)\\NICE Systems\\Real-Time ${software}\\*" /y`;
        }

        batchScript += '\ngoto :success';
      } // end 64
    } // end include hotfixes

    batchScript += `\n\n${this.state.batchTemplate.closure}`;

    this.setState({ batchScript });

    jump('batchScriptContainer');

    /* console.log(batchSoftwareProperties);
      console.log(batchITIProperties);
      console.log(batchRTAMProperties); */
  };

  downloadBatchScript = () => {
    download('batchScript.bat', this.state.batchScript);
  };

  addHotFix = () => {
    const newHotfix = { id: this.state.hotfixes.length + 1, value: '' };

    this.setState(prevState => ({
      hotfixes: [...prevState.hotfixes, newHotfix],
    }));
  };

  setHotfix = (value, hotfixId) => {
    this.setState(prevState => ({
      hotfixes: prevState.hotfixes.map(hotfix => {
        if (hotfixId === hotfix.id) {
          return {
            ...hotfix,
            value,
          };
        }
        return hotfix;
      }),
    }));
  };

  toggleVisibleProps = (e, type) => {
    e.preventDefault();
    window.location.href = '/#summary';
    switch (type) {
      case 'client':
        this.setState(prevState => {
          const showClientProperties = !prevState.showClientProperties;
          return { showClientProperties };
        });
        break;

      case 'rtam':
        this.setState(prevState => {
          const showRTAMProperties = !prevState.showRTAMProperties;
          return { showRTAMProperties };
        });
        break;

      case 'iti':
        this.setState(prevState => {
          const showITIProperties = !prevState.showITIProperties;
          return { showITIProperties };
        });
        break;

      default:
        return false;
    }
    return true;
  };

  SoftwareProperties = (properties, software) => {
    let fullProperties = null;
    const filterRegex = RegExp(`[a-zA-Z]*${this.state.searchSoftwareFilter}[a-zA-Z]*`, 'gmi');

    fullProperties =
      software === 'Client' ? properties.Client : properties.Designer;

    if (this.state.searchSoftwareFilter !== '') {
      fullProperties = fullProperties.filter(item => {
        if (filterRegex.test(item.property)) {
          item.visible = true;
        } else {
          item.visible = false;
        }

        return item;
      });
    } else {
      fullProperties = fullProperties.filter(item => {
        item.visible = true;
        return item;
      });
    }

    return this.renderTableCols(fullProperties, software);
  }


  renderTableCols = (data, type) => {
    let htmlElements = null;
    let input_name = null;

    try {
      htmlElements = data.map(key => {
        input_name = `${type}[${key.property}]`;
        let result = null;
        const inputKey = `${type}_${key.property}`;

        if (key.control.type === 'select') {
          result = (
            <tr
              key={inputKey}
              className="d-flex"
              ref={(node) => {
                if (node && key.visible === true) {
                  node.style.removeProperty('display');
                } else if (node && key.visible === false) {
                  node.style.setProperty('display', 'none', 'important');
                }
              }}
            >
              <th className="col-3">{key.property}</th>
              <td className="col-2">
                <PropertyValues inputKey={inputKey} values={key.values} />
              </td>
              <td className="col-5">
                <select
                  className="custom-select"
                  name={input_name}
                  defaultValue={key.control.default}
                >
                  <RenderOptions inputKey={inputKey} options={key.control.values} />
                </select>
              </td>
              <td className="col-2">{key.description}</td>
            </tr>
          );
        }

        if (key.control.type === 'text') {
          result = (
            <tr
              key={inputKey}
              className="d-flex"
              ref={(node) => {
                if (node && key.visible === true) {
                  node.style.removeProperty('display');
                } else if (node && key.visible === false) {
                  node.style.setProperty('display', 'none', 'important');
                }
              }}
            >
              <th className="col-3">{key.property}</th>
              <td className="col-2">
                {' '}
                <PropertyValues inputKey={inputKey} values={key.values} />{' '}
              </td>
              <td className="col-5">
                <input
                  type="text"
                  name={input_name}
                  className="form-control"
                  defaultValue={key.control.default}
                />
              </td>
              <td className="col-2">{key.description}</td>
            </tr>
          );
        }

        if (key.control.type === 'checkbox') {
          result = (
            <tr
              key={inputKey}
              className="d-flex"
              ref={(node) => {
                if (node && key.visible === true) {
                  node.style.removeProperty('display');
                } else if (node && key.visible === false) {
                  node.style.setProperty('display', 'none', 'important');
                }
              }}
            >
              <th className="col-3">{key.property}</th>
              <td className="col-2">
                <PropertyValues inputKey={inputKey} values={key.values} />
              </td>
              <td className="col-5">
                <RenderCheckBox
                  type={type}
                  property={key.property}
                  value={key.control.value}
                  default={key.control.default}
                />
              </td>
              <td className="col-2">{key.description}</td>
            </tr>
          );
        }

        return result;
      });
    } catch (e) {
      /*eslint-disable */
      console.log(e);
      /* eslint-enable */
    }

    return htmlElements;
  }


  RTAMProperties = properties => {
    const filterRegex = RegExp(`[a-zA-Z]*${this.state.searchRTAMFilter}[a-zA-Z]*`, 'gmi');

    if (this.state.searchRTAMFilter !== '') {
      properties = properties.filter(item => {
        if (filterRegex.test(item.property)) {
          item.visible = true;
        } else {
          item.visible = false;
        }

        return item;
      });
    } else {
      properties = properties.filter(item => {
        item.visible = true;
        return item;
      });
    }

    return this.renderTableCols(properties, 'RTAM');
  }

  ITIProperties = properties => {
    const filterRegex = RegExp(`[a-zA-Z]*${this.state.searchITIFilter}[a-zA-Z]*`, 'gmi');

    if (this.state.searchITIFilter !== '') {
      properties = properties.filter(item => {
        if (filterRegex.test(item.property)) {
          item.visible = true;
        } else {
          item.visible = false;
        }

        return item;
      });
    } else {
      properties = properties.filter(item => {
        item.visible = true;
        return item;
      });
    }

    return this.renderTableCols(properties, 'ITI');
  }

  setSearchFilter = (type, e) => {
    switch (type) {
      case 'software':
        this.setState({ searchSoftwareFilter: e.target.value });
        break;

      case 'iti':
        this.setState({ searchITIFilter: e.target.value });
        break;

      case 'rtam':
        this.setState({ searchRTAMFilter: e.target.value });
        break;

      default:
        this.setState({ searchSoftwareFilter: e.target.value });
        break;
    }
  }

  render() {
    return (
      <div className="props-conatiner">
        <h2 id="summary">Installation Summary</h2>
        <p>You&apos;re installing...</p>
        <ul>
          <li>
            RT
            {this.state.software} version:
            {this.state.version} - MSI:
            {this.state.msi}{' '}
          </li>
          <li>
            {this.state.include_iti
              ? `Installing ITI Bridge: ${this.state.iti}`
              : 'Not Including ITI Bridge'}
          </li>
          <li>
            {this.state.include_rtam
              ? `Installing RTAM: ${this.state.rtam}`
              : 'Not Including RTAM'}
          </li>
        </ul>

        <form
          onSubmit={this.handleSubmit}
          id="propertiesForm"
          className="properties-form"
        >
          <h2 className="sticky">
            {this.state.software === 'Client'
              ? 'Client Properties'
              : 'Designer Properties'}
            <button
              type="button"
              className="hs-properties"
              onClick={e => this.toggleVisibleProps(e, 'client')}
            >
              {this.state.showClientProperties ? 'hide' : 'show'}
            </button>
            <input
              type="text"
              placeholder={`Search a ${this.state.software} property`}
              className="form-control"
              value={this.state.searchSoftwareFilter}
              onChange={(e) => this.setSearchFilter('software', e)}
              style={{
                display: this.state.showClientProperties ? 'block' : 'none',
              }}
            />
          </h2>
          <hr
            style={{
              display: this.state.showClientProperties ? 'none' : 'block',
            }}
          />
          <table
            style={{
              display: this.state.showClientProperties ? 'table' : 'none',
            }}
            className="table table-bordered"
          >
            <thead>
              <tr className="d-flex">
                <th className="col-3">Property</th>
                <th className="col-2">Values</th>
                <th className="col-5">Default value</th>
                <th className="col-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {this.SoftwareProperties(this.state.properties, this.state.software)}
            </tbody>
          </table>
          {this.state.include_iti ? (
            <div className="iti-properties">
              <h2 className="sticky">
                ITI Bridge Properties
                <button
                  type="button"
                  className="hs-properties"
                  onClick={e => this.toggleVisibleProps(e, 'iti')}
                >
                  {this.state.showITIProperties ? 'hide' : 'show'}
                </button>
                <input
                  type="text"
                  placeholder="Search an ITI property"
                  className="form-control"
                  value={this.state.searchITIFilter}
                  onChange={(e) => this.setSearchFilter('iti', e)}
                  style={{
                    display: this.state.showITIProperties ? 'block' : 'none',
                  }}
                />
              </h2>
              <hr
                style={{
                  display: this.state.showITIProperties ? 'none' : 'block',
                }}
              />
              <table
                style={{
                  display: this.state.showITIProperties ? 'table' : 'none',
                }}
                className="table table-bordered"
              >
                <thead>
                  <tr className="d-flex">
                    <th className="col-3">Property</th>
                    <th className="col-2">Values</th>
                    <th className="col-5">Default value</th>
                    <th className="col-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {this.ITIProperties(this.state.properties.ITI)}
                </tbody>
              </table>
            </div>
          ) : (
            ''
          )}

          {this.state.include_rtam ? (
            <div className="rtam-properties">
              <h2 className="sticky">
                RTAM Properties
                <button
                  type="button"
                  className="hs-properties"
                  onClick={e => this.toggleVisibleProps(e, 'rtam')}
                >
                  {this.state.showRTAMProperties ? 'hide' : 'show'}
                </button>
                <input
                  type="text"
                  placeholder="Search a RTAM property"
                  className="form-control"
                  value={this.state.searchRTAMFilter}
                  onChange={(e) => this.setSearchFilter('rtam', e)}
                  style={{
                    display: this.state.showRTAMProperties ? 'block' : 'none',
                  }}
                />
              </h2>
              <hr
                style={{
                  display: this.state.showRTAMProperties ? 'none' : 'block',
                }}
              />
              <table
                style={{
                  display: this.state.showRTAMProperties ? 'table' : 'none',
                }}
                className="table table-bordered"
              >
                <thead>
                  <tr className="d-flex">
                    <th className="col-3">Property</th>
                    <th className="col-2">Values</th>
                    <th className="col-5">Default value</th>
                    <th className="col-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {this.RTAMProperties(this.state.properties.RTAM)}
                </tbody>
              </table>
            </div>
          ) : (
            ''
          )}

          {this.state.include_hotfixes ? (
            <div className="hot-fixes-wrapper">
              <h2>Hot Fixes</h2>
              <p>
                Single files that will be copied to the RT
                {this.state.software} program files folder
              </p>
              {this.state.hotfixes.map(key => (
                <div key={key.id} className="form-group row">
                  <label htmlFor="msi" className="col-2 col-form-label">
                    Hotfix
                    {key.id} file name:
                  </label>
                  <div className="col-10">
                    <input
                      required
                      type="text"
                      value={key.value}
                      onChange={e => this.setHotfix(e.target.value, key.id)}
                      className="form-control"
                    />
                  </div>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={this.addHotFix}
                  className="btn btn-info"
                >
                  Add Hot Fix
                </button>
              </div>
            </div>
          ) : (
            ''
          )}

          <div className="form-group row">
            <div className="offset-4 col-8">
              <button type="submit" className="btn btn-primary">
                Generate Script
              </button>
            </div>
          </div>
        </form>
        <div id="batchScriptContainer">
          {this.state.batchScript ? (
            <div>
              <h2>
                Batch Script:
                <button
                  onClick={this.downloadBatchScript}
                  type="button"
                  className="btn btn-success"
                >
                  Download file
                </button>
              </h2>
              <p>Bear in mind before execution...</p>
              <ul>
                <li>
                  All installers must be at the same folder level of the .bat
                  script
                </li>
                <li>
                  HotFixes must be placed under a folder named
                  &ldquo;Hotfixes&ldquo;
                </li>
              </ul>
              <p>Preview:</p>
              <pre id="batchScript">{this.state.batchScript}</pre>
            </div>
          ) : (
            ''
          )}
        </div>
      </div>
    );
  }
} // class end

function PropertyValues(props) {
  const propertyValues = props.values.map(value => (
    <div key={`${props.inputKey}_propValue_${value}`}>{value}</div>
  ));

  return propertyValues;
}

function RenderOptions(props) {
  const options = props.options.map(value => (
    <option key={`${props.inputKey}_option_${Object.values(value)[0]}`} value={Object.values(value)[0]}>
      {Object.keys(value)[0]}
    </option>
  ));

  return options;
}

function RenderCheckBox(props) {
  const defaultValue = props.default;
  const checkValue = props.value;

  let input = null;

  const input_name = `${props.type}[${props.property}]`;

  if (defaultValue === checkValue) {
    input = (
      <input
        defaultChecked
        name={input_name}
        type="checkbox"
        className="custom-control-input"
        value={checkValue}
      />
    );
  } else {
    input = (
      <input
        name={input_name}
        type="checkbox"
        className="custom-control-input"
        value={checkValue}
      />
    );
  }

  return (
    <label className="custom-control custom-checkbox">
      {input}
      <span className="custom-control-indicator" />
      <span className="custom-control-description" />
    </label>
  );
}

Properties.propTypes = {
  version: PropTypes.string,
  software: PropTypes.string,
  include_iti: PropTypes.bool,
  include_rtam: PropTypes.bool,
  architecture: PropTypes.string,
  msi: PropTypes.string,
  msi64: PropTypes.string,
  iti: PropTypes.string,
  rtam: PropTypes.string,
  include_hotfixes: PropTypes.bool,
};

Properties.defaultProps = {
  software: 'Client',
  version: '6.7',
  msi: 'NICE Real-Time Client.msi',
  msi64: 'NICE Real-Time Client 64.msi',
  include_iti: false,
  iti: '',
  include_rtam: false,
  rtam: '',
  include_hotfixes: false,
  architecture: '6432',
};

RenderCheckBox.propTypes = {
  type: PropTypes.string,
  property: PropTypes.string,
  value: PropTypes.string,
  default: PropTypes.string,
};

RenderCheckBox.defaultProps = {
  type: '',
  property: '',
  value: '',
  default: '',
};

export default Properties;
