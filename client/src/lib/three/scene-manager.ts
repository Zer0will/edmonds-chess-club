/**
 * Three.js scene manager for the scroll-driven chess piece atmosphere.
 *
 * Responsibilities:
 *   - Set up renderer, scene, camera, lights
 *   - Procedurally generate ~10 chess piece meshes at varying depths
 *   - Drive position/rotation from scroll progress
 *   - Apply ambient idle motion + cursor parallax in the render loop
 *   - Pause rendering when canvas is off-screen
 *   - Tear down cleanly
 */
import * as THREE from "three";
import { getPieceGeometry, type PieceKind } from "./piece-geometry";

interface PieceConfig {
  kind: PieceKind;
  color: "white" | "black";
  /** Horizontal position, in viewport units: -1 (left edge) to +1 (right edge). */
  x: number;
  /** Depth layer: 0 (closest, biggest, fastest parallax) to 1 (farthest, smallest, slowest). */
  depth: number;
  /** Vertical anchor in scroll-page space, normalized 0 (top) to N_SECTIONS (bottom). */
  scrollAnchor: number;
  /** Base rotation (radians). */
  baseRotY: number;
  /** How much extra Y rotation to apply across full scroll (radians). */
  scrollRotY: number;
  /** Idle motion phase offset (seconds). */
  idlePhase: number;
}

const PIECE_LAYOUT: PieceConfig[] = [
  // Hero section — these establish the world
  { kind: "knight", color: "white", x: -0.65, depth: 0.0, scrollAnchor: 0.15, baseRotY: 0.3, scrollRotY: Math.PI, idlePhase: 0 },
  { kind: "queen", color: "black", x: 0.7, depth: 0.2, scrollAnchor: 0.25, baseRotY: -0.4, scrollRotY: Math.PI * 0.5, idlePhase: 1.2 },
  { kind: "bishop", color: "white", x: 0.35, depth: 0.5, scrollAnchor: 0.05, baseRotY: 0.2, scrollRotY: -Math.PI * 0.4, idlePhase: 2.4 },
  { kind: "pawn", color: "black", x: -0.4, depth: 0.7, scrollAnchor: 0.35, baseRotY: 0, scrollRotY: 0.6, idlePhase: 0.6 },

  // Mid-page — supporting cast
  { kind: "king", color: "black", x: -0.55, depth: 0.1, scrollAnchor: 0.7, baseRotY: 0.5, scrollRotY: Math.PI * 0.3, idlePhase: 1.8 },
  { kind: "rook", color: "white", x: 0.55, depth: 0.4, scrollAnchor: 0.85, baseRotY: -0.2, scrollRotY: 0.4, idlePhase: 3.0 },
  { kind: "knight", color: "black", x: 0.25, depth: 0.6, scrollAnchor: 1.1, baseRotY: -0.6, scrollRotY: -Math.PI, idlePhase: 2.0 },
  { kind: "pawn", color: "white", x: -0.3, depth: 0.8, scrollAnchor: 1.3, baseRotY: 0, scrollRotY: 0.5, idlePhase: 0.4 },

  // Lower sections — anchor pieces
  { kind: "bishop", color: "black", x: 0.6, depth: 0.3, scrollAnchor: 1.7, baseRotY: 0.4, scrollRotY: -Math.PI * 0.3, idlePhase: 1.5 },
  { kind: "queen", color: "white", x: -0.5, depth: 0.45, scrollAnchor: 2.0, baseRotY: -0.3, scrollRotY: Math.PI * 0.4, idlePhase: 2.8 },
];

const COLORS = {
  // Marble white — warm-ivory with a hint of the gold accent
  whiteMat: 0xe6dfc9,
  // Black marble — deep navy-black tinted with the site's purple accent
  blackMat: 0x2a2245,
  // Purple emissive accent shared by both
  emissive: 0x7b5ea7,
};

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  totalScrollHeight: () => number;
}

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pieces: { mesh: THREE.Object3D; cfg: PieceConfig }[] = [];
  private rafId: number | null = null;
  private isVisible = true;
  private isPaused = false;
  private frameCount = 0;
  private fpsCheckStart = 0;
  private hasDegraded = false;
  private onDegrade: (() => void) | null = null;
  private scrollProgress = 0; // 0..1 across the whole page
  private cursorTarget = new THREE.Vector2(0, 0);
  private cursorCurrent = new THREE.Vector2(0, 0);
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private opts: SceneOptions;
  private capturedPieces: { mesh: THREE.Mesh; born: number; vx: number; vy: number; vrx: number; vry: number; vrz: number }[] = [];

  constructor(opts: SceneOptions) {
    this.opts = opts;

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.set(0, 0, 6);
    this.camera.lookAt(0, 0, 0);

    this.setupLighting();
    this.setupPieces();
    this.handleResize();

    // Listen for resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(opts.container);

    // Pause when off-screen
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.isVisible = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0 },
    );
    this.intersectionObserver.observe(opts.container);

    // Pause when tab is hidden
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  private setupLighting() {
    // Ambient — deep purple-navy fill, like night air
    const ambient = new THREE.AmbientLight(0x40385a, 1.0);
    this.scene.add(ambient);

    // Key light — warm gold from upper right, like a torch
    const key = new THREE.DirectionalLight(0xffd47a, 2.2);
    key.position.set(4, 5, 5);
    this.scene.add(key);

    // Fill — cool purple from upper left, atmospheric
    const fill = new THREE.DirectionalLight(0xa68fd6, 1.3);
    fill.position.set(-5, 3, 4);
    this.scene.add(fill);

    // Rim — soft white from behind, catches piece edges
    const rim = new THREE.PointLight(0xd0c8c0, 1.5, 25);
    rim.position.set(0, 2, -4);
    this.scene.add(rim);
  }

  private setupPieces() {
    for (const cfg of PIECE_LAYOUT) {
      const geo = getPieceGeometry(cfg.kind);
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color === "white" ? COLORS.whiteMat : COLORS.blackMat,
        roughness: 0.4,
        metalness: 0.1,
        emissive: COLORS.emissive,
        emissiveIntensity: cfg.color === "white" ? 0.08 : 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Pieces in the background are smaller; foreground bigger
      const scale = THREE.MathUtils.lerp(0.8, 0.32, cfg.depth);
      mesh.scale.setScalar(scale);

      // Pivot at the piece base — translate group so rotation origin is the bottom-center
      const group = new THREE.Group();
      mesh.position.y = -0.5 * scale; // center the piece vertically about its midpoint
      group.add(mesh);
      group.rotation.y = cfg.baseRotY;

      this.scene.add(group);
      this.pieces.push({ mesh: group, cfg });
    }
  }

  private handleResize = () => {
    const w = this.opts.container.clientWidth;
    const h = this.opts.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private handleVisibility = () => {
    this.isPaused = document.hidden;
  };

  public setScrollProgress(p: number) {
    this.scrollProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  public setCursor(nx: number, ny: number) {
    // Expect -1..1 range. Clamp anyway.
    this.cursorTarget.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1));
  }

  /**
   * Trigger a tumble animation on the closest piece to the given color
   * (used as a delight moment when a real game piece is captured).
   * The 3D piece detaches from its scroll anchor and falls with gravity.
   */
  public triggerCapture(color: "white" | "black") {
    // Find a piece of the same color that is reasonably visible
    const candidate = this.pieces.find(
      (p) =>
        p.cfg.color === color &&
        Math.abs(this.getPieceVerticalPosition(p.cfg) - 0) < 4,
    );
    if (!candidate) return;

    // Detach mesh from the scroll-managed group and add to scene root with current world transform
    const mesh = candidate.mesh.children[0] as THREE.Mesh;
    if (!mesh) return;

    candidate.mesh.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    const worldQuat = new THREE.Quaternion();
    mesh.getWorldQuaternion(worldQuat);
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);

    candidate.mesh.remove(mesh);

    const clone = mesh.clone();
    clone.position.copy(worldPos);
    clone.quaternion.copy(worldQuat);
    clone.scale.copy(worldScale);
    this.scene.add(clone);

    // Hide the original for ~2 seconds; respawn cleanly afterwards
    setTimeout(() => {
      const fresh = mesh.clone();
      fresh.position.set(0, -0.5 * worldScale.x, 0);
      fresh.scale.copy(mesh.scale);
      candidate.mesh.add(fresh);
    }, 2200);

    this.capturedPieces.push({
      mesh: clone,
      born: this.clock.getElapsedTime(),
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 1.5,
      vrx: (Math.random() - 0.5) * 12,
      vry: (Math.random() - 0.5) * 12,
      vrz: (Math.random() - 0.5) * 12,
    });
  }

  private getPieceVerticalPosition(cfg: PieceConfig): number {
    // Scroll anchor 0 → top of camera view; advance downward as scroll progresses
    const totalSections = 2.2; // matches max anchor in PIECE_LAYOUT
    const localProgress = this.scrollProgress * totalSections;
    // Each piece's vertical position is anchor minus current progress, mapped into a vertical strip
    const ystrip = (cfg.scrollAnchor - localProgress) * 3.5;
    return ystrip;
  }

  private updatePieces(dt: number, t: number) {
    // Cursor lerp
    this.cursorCurrent.x += (this.cursorTarget.x - this.cursorCurrent.x) * 0.08;
    this.cursorCurrent.y += (this.cursorTarget.y - this.cursorCurrent.y) * 0.08;

    for (const { mesh, cfg } of this.pieces) {
      // Parallax: foreground (depth=0) moves at full speed, background (depth=1) at 0.3x
      const speedMul = THREE.MathUtils.lerp(1.0, 0.3, cfg.depth);
      const yStrip = this.getPieceVerticalPosition(cfg) * speedMul;

      // x positions: foreground wider, background narrower
      const xRange = THREE.MathUtils.lerp(3.0, 1.8, cfg.depth);
      const baseX = cfg.x * xRange;

      // Cursor parallax — foreground reacts more
      const cursorMul = (1 - cfg.depth) * 0.4;
      const cursorOffsetX = this.cursorCurrent.x * cursorMul;
      const cursorOffsetY = this.cursorCurrent.y * cursorMul * 0.5;

      // Ambient idle motion — gentle sine wave on Y
      const idleAmp = 0.18 * (1 - cfg.depth * 0.5);
      const idleY = Math.sin(t * 0.6 + cfg.idlePhase) * idleAmp;
      const idleRot = Math.sin(t * 0.4 + cfg.idlePhase * 1.3) * 0.05;

      mesh.position.set(baseX + cursorOffsetX, yStrip + idleY + cursorOffsetY, -cfg.depth * 1.2);

      // Scroll-driven rotation — eased so it doesn't feel mechanical
      const rotProgress = easeOutCubic(this.scrollProgress);
      mesh.rotation.y = cfg.baseRotY + cfg.scrollRotY * rotProgress + idleRot;
      // Bishops/kings also tilt slightly
      if (cfg.kind === "bishop") {
        mesh.rotation.x = Math.sin(this.scrollProgress * Math.PI) * 0.18;
      } else if (cfg.kind === "king") {
        mesh.rotation.z = Math.sin(t * 0.3 + cfg.idlePhase) * 0.04;
      }
    }

    // Captured pieces — gravity, spin, fade
    const G = 9.8;
    const now = this.clock.getElapsedTime();
    for (let i = this.capturedPieces.length - 1; i >= 0; i--) {
      const c = this.capturedPieces[i];
      const age = now - c.born;
      c.vy -= G * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.rotation.x += c.vrx * dt;
      c.mesh.rotation.y += c.vry * dt;
      c.mesh.rotation.z += c.vrz * dt;
      const mat = (c.mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (age > 1.5) {
        mat.transparent = true;
        mat.opacity = Math.max(0, 1 - (age - 1.5) / 0.6);
      }
      if (age > 2.2) {
        this.scene.remove(c.mesh);
        mat.dispose();
        this.capturedPieces.splice(i, 1);
      }
    }
  }

  public setDegradeCallback(cb: () => void) {
    this.onDegrade = cb;
  }

  public start() {
    if (this.rafId !== null) return;
    this.fpsCheckStart = performance.now();
    this.frameCount = 0;
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      if (this.isPaused || !this.isVisible) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.getElapsedTime();
      this.updatePieces(dt, t);
      this.renderer.render(this.scene, this.camera);

      // FPS monitoring: sample every 3 seconds; if sustained < 30fps after 5s, degrade.
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.fpsCheckStart;
      if (elapsed > 3000 && !this.hasDegraded) {
        const fps = (this.frameCount * 1000) / elapsed;
        // Skip the first window (initial paint can stutter); only check after t > 5s
        if (this.clock.getElapsedTime() > 5 && fps < 30) {
          this.hasDegraded = true;
          this.onDegrade?.();
        }
        this.frameCount = 0;
        this.fpsCheckStart = now;
      }
    };
    loop();
  }

  public dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.pieces.forEach(({ mesh }) => {
      mesh.traverse((o) => {
        if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
        const mat = (o as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      this.scene.remove(mesh);
    });
    this.capturedPieces.forEach((c) => {
      const mat = c.mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
      this.scene.remove(c.mesh);
    });
    this.renderer.dispose();
  }
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
