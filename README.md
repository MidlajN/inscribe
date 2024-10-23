<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>

<p align="center">

<img width="60" height="68" alt="Inscribe Logo" src=""/>
</p>
<p align="center">

  <h1 align="center">Incsribe</h1>
</p>

This project is a Vite + React application that serves as a frontend for a Fabric.js canvas. It allows users to draw freely and send their drawings to a plotter using FluidNC. The application supports automatic pen selection with G-code commands for handling multiple colors.

## Features

- **Free Drawing Tool**: Users can draw on the canvas using a freehand drawing tool powered by Fabric.js.
- **8 Color Setup**: The application supports 8 pre-configured colors, each associated with specific G-code commands for automatic pen selection on the plotter.
- **Plotter Integration**: The drawn elements can be sent to a plotter, which is managed via FluidNC, enabling the automatic switching between different pen colors.

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Plotter Setup](#plotter-setup)
4. [Configuration](#configuration)
5. [Development](#development)
6. [Contributing](#contributing)
7. [License](#license)

## Installation

To set up the project locally:

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/your-project.git
   ```

2. Navigate to the project directory:

   ```bash
   cd your-project
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Access the application at `http://localhost:3000`.

## Usage

1. **Canvas Drawing**:
   - Select a color from the 8 pre-configured options.
   - Draw on the canvas using your mouse or touchpad.
   - Each color corresponds to a specific pen on the plotter, with G-code instructions for automatic pen selection.

2. **Sending to Plotter**:
   - After drawing, click the "Send to Plotter" button to send your drawing to the plotter.
   - The plotter will automatically select the appropriate pen based on the chosen colors and execute the drawing.
   - Ensure the plotter is configured with FluidNC and connected to the network.

## Plotter Setup

To use the plotter with FluidNC, ensure the following:

1. Install and configure FluidNC on your plotter.
2. The plotter must be connected to the network with a stable WebSocket connection.
3. The application will send G-code commands to control the pen movements and execute the drawing on the plotter.

Refer to [FluidNC documentation](https://github.com/bdring/FluidNC) for further setup instructions.

### Pen Selection

For each color, G-code commands are predefined to automatically pick and drop pens during the drawing process. Below is a sample of the pen selection G-code for the colors:

- **Yellow**:
  - Pen Pick: `['G53 Y50', 'G53 X799.9Z-26.3', 'G53 Y1.2', 'G53 Z-16', 'G53 Y60', 'G53 X420']`
  - Pen Drop: `['G53 Y50', 'G53 X799.9Z-16', 'G53 Y1.2', 'G53 Z-26.3', 'G53 Y50']`
  
- **Green**:
  - Pen Pick: `['G53 Y60', 'G53 X763.3Z-26.3', 'G53 Y1.2', 'G53 Z-16', 'G53 Y60', 'G53 X420']`
  - Pen Drop: `['G53 Y60', 'G53 X763.3Z-16', 'G53 Y1.2', 'G53 Z-26.3', 'G53 Y60']`

(Include similar details for the remaining colors)

## Configuration

### Color Setup

The application defines 8 colors, each associated with a specific G-code setup for pen pick and drop. Here's an example configuration for colors:

```javascript
const [colors, setColors] = useState([
  { 
    color: '#ffff00', 
    name: 'Yellow', 
    zValue: -33.4, 
    penPick: [ 'G53 Y50', 'G53 X799.9Z-26.3', 'G53 Y1.2', 'G53 Z-16', 'G53 Y60', 'G53 X420' ],
    penDrop: [ 'G53 Y50', 'G53 X799.9Z-16', 'G53 Y1.2', 'G53 Z-26.3', 'G53 Y50' ]
  },
  // Add similar entries for other colors
]);
```

### Plotter Connection

You can configure the plotter's connection details using the `config` state:

```javascript
const [ config, setConfig ] = useState({
  url: window.location.hostname,  // You can change this to your plotter's local network address
  feedRate: 7000,
  jogSpeed: 10000,
  zOffset: 5,
  open: false
});
```

## Development

To modify the project:

- **Run the development server**: 
  ```bash
  npm run dev
  ```
- **Build the project** for production:
  ```bash
  npm run build
  ```

## Contributing

Contributions are welcome! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) guide for more details.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

This updated README provides clarity on the pen selection and plotting functionalities while maintaining a clear structure for installation and usage.