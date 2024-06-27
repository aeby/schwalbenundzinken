import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  BoxGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
// @ts-expect-error - OrbitControls is not typed
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

@customElement("dt-preview-3d")
export class Preview3D extends LitElement {
  private renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private scene = new Scene();
  private camera = new PerspectiveCamera(75, 1, 0.1, 1000);
  private controls = new OrbitControls(this.camera, this.renderer.domElement);
  private readonly cube: Mesh;

  constructor() {
    super();

    this.renderer.setAnimationLoop(this._animate);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;

    this.camera.position.z = 2;

    const ambientLight = new HemisphereLight(0xffffbb, 0x080820, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 10).normalize();
    this.scene.add(directionalLight);

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: 0x00ff00 });
    this.cube = new Mesh(geometry, material);
    this.scene.add(this.cube);
  }

  protected firstUpdated() {
    const container = this.shadowRoot?.getElementById("container");

    if (container) {
      container.appendChild(this.renderer.domElement);
      this._handleResize();
    }
  }

  private _animate = () => {
    this.controls.update();
    this._handleResize();
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  };

  private _handleResize = () => {
    const canvas = this.renderer.domElement;

    const width = canvas.clientWidth;
    const height = (width / 16) * 9;

    if (canvas.width !== width) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  };

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
