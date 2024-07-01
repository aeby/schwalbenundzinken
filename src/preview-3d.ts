import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  BoxGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  GridHelper,
  HemisphereLight,
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
  private meshes: Mesh[] = [];

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
  angle = 0;

  constructor() {
    super();

    this.renderer.setAnimationLoop(this._animate);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;

    this.camera.position.set(0, 5, 20);
    this.controls.target.set(0, 5, 0);

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

  protected firstUpdated() {
    const container = this.shadowRoot?.getElementById("container");

    if (container) {
      container.appendChild(this.renderer.domElement);
      this.renderWorkpiece();
      this._handleResize();
    }
  }

  private _animate = () => {
    this.controls.update();
    this._handleResize();
    this.renderer.render(this.scene, this.camera);
  };

  private _handleResize = () => {
    const canvas = this.renderer.domElement;

    const width = canvas.clientWidth;
    const height = (width / 4) * 3;

    if (canvas.width !== width) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  };

  private partShape(part: Part): Shape {
    const shape = new Shape();
    shape.moveTo(part.bottomLeft.x, part.bottomLeft.y);
    shape.lineTo(part.topLeft.x, part.topLeft.y);
    shape.lineTo(part.topRight.x, part.topRight.y);
    shape.lineTo(part.bottomRight.x, part.bottomRight.y);
    shape.lineTo(part.bottomLeft.x, part.bottomLeft.y);
    return shape;
  }

  private getParts(): ReadonlyArray<Mesh> {
    const parts = [];
    const tails = [];

    const width = this.workpieceWidth / 10;
    const height = width * 0.7;
    const depth = this.workpieceHeight / 10;

    const xOffset = width / 2;
    const yOffset = depth / 2;

    const d = this.workpieceHeight / 10 / 2;

    const a = Math.PI / 2 - this.angle;
    const l = Math.PI / 2 - a;
    const r = Math.PI / 2 + a;

    for (let i = 0; i < this.tailsCount; i += 1) {
      const base = i * (this.pinWidth + this.tailWidth);
      const markLeft = (base + this.pinWidth) / 10;
      const markRight = (base + this.pinWidth + this.tailWidth) / 10;

      const tailPart = {
        bottomLeft: {
          x: markLeft - d / Math.tan(l) - xOffset,
          y: -d + yOffset,
        },
        topLeft: { x: markLeft + d / Math.tan(l) - xOffset, y: d + yOffset },
        bottomRight: {
          x: markRight - d / Math.tan(r) - xOffset,
          y: -d + yOffset,
        },
        topRight: { x: markRight + d / Math.tan(r) - xOffset, y: d + yOffset },
      };

      tails.push(tailPart);

      const shape = this.partShape(tailPart);
      const part = this.partMesh(shape, 0x92663e);

      part.translateZ(height / 2);

      parts.push(part);
    }
    return parts;
  }

  private partMesh(shape: Shape, color: number) {
    const geometry = new ExtrudeGeometry(shape, {
      depth: this.workpieceHeight / 10,
      bevelEnabled: false,
    });

    return new Mesh(geometry, new MeshStandardMaterial({ color }));
  }

  updated() {
    this.renderWorkpiece();
  }

  private renderWorkpiece() {
    this.scene.remove(...this.meshes);

    const panelMaterial = new MeshStandardMaterial({ color: 0xcda678 });
    const panelMaterialTest = new MeshStandardMaterial({ color: 0x92663e });

    const width = this.workpieceWidth / 10;
    const height = width * 0.7;
    const depth = this.workpieceHeight / 10;

    const pinBoard = new BoxGeometry(width, height, depth);
    pinBoard.rotateX(Math.PI / 2);
    pinBoard.translate(0, depth / 2, 0);

    const pinBoardMesh = new Mesh(pinBoard, panelMaterial);

    this.scene.add(pinBoardMesh);
    this.meshes.push(pinBoardMesh);

    this.getParts().forEach((part) => {
      this.scene.add(part);
      this.meshes.push(part);
    });

    const panelFront = new BoxGeometry(width, height, depth);
    panelFront.translate(0, height / 2 + depth, height / 2 + depth / 2);

    const panelFrontMesh = new Mesh(panelFront, panelMaterialTest);

    this.scene.add(panelFrontMesh);
    this.meshes.push(panelFrontMesh);
  }

  render() {
    return html` <div id="container"></div>`;
  }

  static styles = css`
    canvas {
      border: 1px solid #eee;
      box-sizing: border-box;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dt-preview-3d": Preview3D;
  }
}
