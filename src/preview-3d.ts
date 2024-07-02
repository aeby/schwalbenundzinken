import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  BoxGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  GridHelper,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  WebGLRenderer,
} from "three";
// @ts-expect-error - OrbitControls is not typed
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface Point {
  x: number;
  y: number;
}

interface Part {
  bottomLeft: Point;
  topLeft: Point;
  bottomRight: Point;
  topRight: Point;
}

@customElement("dt-preview-3d")
export class Preview3D extends LitElement {
  private renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private scene = new Scene();
  private camera = new PerspectiveCamera(45, 1);
  private controls = new OrbitControls(this.camera, this.renderer.domElement);
  private tailMaterial = new MeshStandardMaterial({ color: 0x92663e });
  private pinMaterial = new MeshStandardMaterial({ color: 0xcda678 });
  private tailGroup = new Group();
  private pinGroup = new Group();
  private assembled = true;

  @property()
  workpieceWidth = 0;

  @property()
  workpieceHeight = 0;

  @property()
  tailsCount = 0;

  @property()
  pinWidth = 0;

  @property()
  tailWidth = 0;

  @property()
  tailMarkOffset = 0;

  get width(): number {
    return this.workpieceWidth / 10;
  }

  get height(): number {
    return this.width * 0.7;
  }

  get depth(): number {
    return this.workpieceHeight / 10;
  }

  get cornerOffset(): number {
    return this.tailMarkOffset / 10;
  }

  constructor() {
    super();

    this.setupScene();
    this.renderer.setAnimationLoop(this.loop);
  }

  protected firstUpdated() {
    const container = this.shadowRoot?.getElementById("container");

    if (container) {
      container.appendChild(this.renderer.domElement);
      this.renderWorkpiece();
      this.handleResize();
    }

    this.setupControls();
  }

  updated() {
    this.renderWorkpiece();
  }

  render() {
    return html`
      <div id="container"></div>
      <div class="modifiers">
        <input
          type="checkbox"
          id="assembled"
          name="assembled"
          checked
          @change=${this.onAssembledChange.bind(this)}
        />
        <label for="assembled">Assembled</label>
      </div>
    `;
  }

  private renderWorkpiece() {
    this.pinGroup.clear();
    this.tailGroup.clear();

    const pinBoard = new BoxGeometry(this.width, this.height, this.depth);
    pinBoard.rotateX(Math.PI / 2);
    pinBoard.translate(0, this.depth / 2, 0);

    const pinBoardMesh = new Mesh(pinBoard, this.pinMaterial);

    this.pinGroup.add(pinBoardMesh);
    this.scene.add(this.pinGroup);

    const tailBoard = new BoxGeometry(this.width, this.height, this.depth);
    tailBoard.translate(
      0,
      this.height / 2 + this.depth,
      this.height / 2 + this.depth / 2,
    );

    const tailBoardMesh = new Mesh(tailBoard, this.tailMaterial);

    this.tailGroup.add(tailBoardMesh);
    this.scene.add(this.tailGroup);

    this.addParts(this.pinGroup, this.tailGroup);
  }

  private setupControls() {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.camera.position.set(0, this.height / 2, 20);
    this.controls.target.set(0, this.height / 2, 0);
  }

  private setupScene() {
    const ambientLight = new HemisphereLight(0xffffff, 0xdddddd, 2);
    this.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 20).normalize();
    this.scene.add(directionalLight);

    const size = 50;
    const divisions = 50;

    const gridHelper = new GridHelper(size, divisions, 0xdddddd, 0xeeeeee);
    this.scene.add(gridHelper);
  }

  private loop = () => {
    this.controls.update();
    this.handleResize();

    if (this.assembled && this.tailGroup.position.z > 0) {
      this.tailGroup.position.z -= 0.2;

      if (this.tailGroup.position.z < 0) {
        this.tailGroup.position.z = 0;
      }
    }

    if (!this.assembled && this.tailGroup.position.z < this.depth * 2) {
      this.tailGroup.position.z += 0.2;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private handleResize = () => {
    const canvas = this.renderer.domElement;

    const width = canvas.clientWidth;
    const height = (width / 4) * 3;

    if (canvas.width !== width) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  };

  private onAssembledChange(e: Event): void {
    this.assembled = (e.target as HTMLInputElement).checked;
    console.log(this.assembled);
  }

  private partShape(part: Part): Shape {
    const shape = new Shape();
    shape.moveTo(part.bottomLeft.x, part.bottomLeft.y);
    shape.lineTo(part.topLeft.x, part.topLeft.y);
    shape.lineTo(part.topRight.x, part.topRight.y);
    shape.lineTo(part.bottomRight.x, part.bottomRight.y);
    shape.lineTo(part.bottomLeft.x, part.bottomLeft.y);
    return shape;
  }

  private addParts(pinBoard: Group, tailBoard: Group) {
    const xOffset = this.width / 2;
    const yOffset = this.depth / 2;

    const centerLineOffset = this.workpieceHeight / 10 / 2;

    // Initialize first pin
    const currentPin = {
      bottomLeft: { x: -xOffset, y: -centerLineOffset + yOffset },
      topLeft: { x: -xOffset, y: centerLineOffset + yOffset },
      bottomRight: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
    };

    for (let i = 0; i < this.tailsCount; i += 1) {
      const base = i * (this.pinWidth + this.tailWidth);
      const markLeft = (base + this.pinWidth) / 10;
      const markRight = (base + this.pinWidth + this.tailWidth) / 10;

      // Finish Pin
      currentPin.topRight = {
        x: markLeft + this.cornerOffset - xOffset,
        y: centerLineOffset + yOffset,
      };
      currentPin.bottomRight = {
        x: markLeft - this.cornerOffset - xOffset,
        y: -centerLineOffset + yOffset,
      };
      const s = this.partShape(currentPin);
      const p = this.partMesh(s, this.pinMaterial);
      p.translateZ(this.height / 2);
      pinBoard.add(p);

      currentPin.bottomLeft = {
        x: markRight + this.cornerOffset - xOffset,
        y: centerLineOffset - yOffset,
      };
      currentPin.topLeft = {
        x: markRight - this.cornerOffset - xOffset,
        y: centerLineOffset + yOffset,
      };

      // Complete last pin
      if (i === this.tailsCount - 1) {
        currentPin.topRight = {
          x: this.width - xOffset,
          y: centerLineOffset + yOffset,
        };
        currentPin.bottomRight = {
          x: this.width - xOffset,
          y: -centerLineOffset + yOffset,
        };
        const shape = this.partShape(currentPin);
        const part = this.partMesh(shape, this.pinMaterial);
        part.translateZ(this.height / 2);
        pinBoard.add(part);
      }

      const tailPart = {
        bottomLeft: {
          x: markLeft - this.cornerOffset - xOffset,
          y: -centerLineOffset + yOffset,
        },
        topLeft: {
          x: markLeft + this.cornerOffset - xOffset,
          y: centerLineOffset + yOffset,
        },
        bottomRight: {
          x: markRight + this.cornerOffset - xOffset,
          y: -centerLineOffset + yOffset,
        },
        topRight: {
          x: markRight - this.cornerOffset - xOffset,
          y: centerLineOffset + yOffset,
        },
      };

      const shape = this.partShape(tailPart);
      const part = this.partMesh(shape, this.tailMaterial);

      part.translateZ(this.height / 2);

      tailBoard.add(part);
    }
  }

  private partMesh(shape: Shape, material: Material) {
    const geometry = new ExtrudeGeometry(shape, {
      depth: this.depth,
      bevelEnabled: false,
    });

    return new Mesh(geometry, material);
  }

  static styles = css`
    canvas {
      border: 1px solid #eee;
      box-sizing: border-box;
      width: 100%;
    }

    .modifiers {
      padding-top: 0.5rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dt-preview-3d": Preview3D;
  }
}
