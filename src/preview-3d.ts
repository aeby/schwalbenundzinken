import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";
import {
  BoxGeometry,
  DirectionalLight,
  ExtrudeGeometry,
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
@localized()
export class Preview3D extends LitElement {
  private renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private scene = new Scene();
  private camera = new PerspectiveCamera(45, 1);
  private controls = new OrbitControls(this.camera, this.renderer.domElement);
  private tailMaterial = new MeshStandardMaterial({ color: 0x888888 });
  private pinMaterial = new MeshStandardMaterial({ color: 0xbbbbbb });
  private tailGroup = new Group();
  private pinGroup = new Group();
  private assembled = true;
  private scale = 0.1;
  private animationSpeed = 0.3;

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
    return this.workpieceWidth * this.scale;
  }

  get height(): number {
    return this.width * 0.6;
  }

  get depth(): number {
    return this.workpieceHeight * this.scale;
  }

  get cornerOffset(): number {
    return this.tailMarkOffset * this.scale;
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
        <label for="assembled">${msg("Assembled")}</label>
      </div>
    `;
  }

  private renderWorkpiece() {
    this.clearGroups();
    this.addBoards();
    this.addParts();
  }

  private clearGroups() {
    this.pinGroup.clear();
    this.tailGroup.clear();
  }

  private addBoards() {
    const pinBoard = new BoxGeometry(this.width, this.height, this.depth);
    pinBoard.rotateX(Math.PI / 2);
    pinBoard.translate(0, this.depth / 2, 0);
    this.pinGroup.add(new Mesh(pinBoard, this.pinMaterial));

    const tailBoard = new BoxGeometry(this.width, this.height, this.depth);
    tailBoard.translate(
      0,
      this.height / 2 + this.depth,
      this.height / 2 + this.depth / 2,
    );
    this.tailGroup.add(new Mesh(tailBoard, this.tailMaterial));
  }

  private addParts() {
    const xOffset = this.width / 2;
    const yOffset = this.depth / 2;
    const centerLineOffset = this.depth / 2;

    const currentPin = this.initializePin(xOffset, yOffset, centerLineOffset);

    for (let i = 0; i < this.tailsCount; i += 1) {
      const base = i * (this.pinWidth + this.tailWidth);
      const markLeft = (base + this.pinWidth) * this.scale;
      const markRight = (base + this.pinWidth + this.tailWidth) * this.scale;

      this.finalizePin(
        currentPin,
        markLeft,
        xOffset,
        yOffset,
        centerLineOffset,
      );
      this.addPartToBoard(this.pinGroup, currentPin, this.pinMaterial);
      this.updatePinForNextCycle(
        currentPin,
        markRight,
        xOffset,
        yOffset,
        centerLineOffset,
      );

      if (i === this.tailsCount - 1) {
        this.finalizeLastPin(currentPin, xOffset, yOffset, centerLineOffset);
        this.addPartToBoard(this.pinGroup, currentPin, this.pinMaterial);
      }

      const tailPart = this.createTailPart(
        markLeft,
        markRight,
        xOffset,
        yOffset,
        centerLineOffset,
      );
      this.addPartToBoard(this.tailGroup, tailPart, this.tailMaterial);
    }
  }

  private initializePin(
    xOffset: number,
    yOffset: number,
    centerLineOffset: number,
  ): Part {
    return {
      bottomLeft: { x: -xOffset, y: -centerLineOffset + yOffset },
      topLeft: { x: -xOffset, y: centerLineOffset + yOffset },
      bottomRight: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
    };
  }

  private finalizePin(
    pin: Part,
    markLeft: number,
    xOffset: number,
    yOffset: number,
    centerLineOffset: number,
  ) {
    pin.topRight = {
      x: markLeft + this.cornerOffset - xOffset,
      y: centerLineOffset + yOffset,
    };
    pin.bottomRight = {
      x: markLeft - this.cornerOffset - xOffset,
      y: -centerLineOffset + yOffset,
    };
  }

  private updatePinForNextCycle(
    pin: Part,
    markRight: number,
    xOffset: number,
    yOffset: number,
    centerLineOffset: number,
  ) {
    pin.bottomLeft = {
      x: markRight + this.cornerOffset - xOffset,
      y: centerLineOffset - yOffset,
    };
    pin.topLeft = {
      x: markRight - this.cornerOffset - xOffset,
      y: centerLineOffset + yOffset,
    };
  }

  private finalizeLastPin(
    pin: Part,
    xOffset: number,
    yOffset: number,
    centerLineOffset: number,
  ) {
    pin.topRight = {
      x: this.width - xOffset,
      y: centerLineOffset + yOffset,
    };
    pin.bottomRight = {
      x: this.width - xOffset,
      y: -centerLineOffset + yOffset,
    };
  }

  private createTailPart(
    markLeft: number,
    markRight: number,
    xOffset: number,
    yOffset: number,
    centerLineOffset: number,
  ): Part {
    return {
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
  }

  private addPartToBoard(board: Group, part: Part, material: Material) {
    const shape = this.createPartShape(part);
    const mesh = this.createPartMesh(shape, material);
    mesh.translateZ(this.height / 2);
    board.add(mesh);
  }

  private createPartShape(part: Part): Shape {
    const shape = new Shape();
    shape.moveTo(part.bottomLeft.x, part.bottomLeft.y);
    shape.lineTo(part.topLeft.x, part.topLeft.y);
    shape.lineTo(part.topRight.x, part.topRight.y);
    shape.lineTo(part.bottomRight.x, part.bottomRight.y);
    shape.lineTo(part.bottomLeft.x, part.bottomLeft.y);
    return shape;
  }

  private createPartMesh(shape: Shape, material: Material) {
    const geometry = new ExtrudeGeometry(shape, {
      depth: this.depth,
      bevelEnabled: false,
    });

    return new Mesh(geometry, material);
  }

  private setupControls() {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.camera.position.set(0, this.height / 2, 20);
    this.controls.target.set(0, this.height / 2, 0);
  }

  private setupScene() {
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new HemisphereLight(0xffffff, 0xdddddd, 2.4);
    this.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 20).normalize();
    this.scene.add(directionalLight);

    this.scene.add(this.tailGroup);
    this.scene.add(this.pinGroup);
  }

  private loop = () => {
    this.controls.update();
    this.handleResize();
    this.animateTailBoard();
    this.renderer.render(this.scene, this.camera);
  };

  private animateTailBoard() {
    if (this.assembled && this.tailGroup.position.z > 0) {
      this.tailGroup.position.z -= this.animationSpeed;

      if (this.tailGroup.position.z < 0) {
        this.tailGroup.position.z = 0;
      }
    }

    if (!this.assembled && this.tailGroup.position.z < this.depth * 3) {
      this.tailGroup.position.z += this.animationSpeed;
    }
  }

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
