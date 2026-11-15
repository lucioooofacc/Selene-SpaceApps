import {Composition, Folder} from 'remotion';
import {DURACION, FPS} from './anim';
import {DemoSelene} from './Demo';
import {DemoEmocion} from './emocion/Emocion';
import {LINEA_EMOCION} from './emocion/linea';
import {DemoEnsayo} from './ensayo/Ensayo';
import {LINEA_ENSAYO} from './ensayo/linea';

export const RemotionRoot = () => (
  <Folder name="SpaceApps">
    <Composition id="DemoSelene" component={DemoSelene} durationInFrames={Math.floor(DURACION * FPS)} fps={FPS} width={1920} height={1080} />
    <Composition id="DemoEmocion" component={DemoEmocion} durationInFrames={Math.floor(LINEA_EMOCION.DURACION * FPS)} fps={FPS} width={1920} height={1080} />
    <Composition id="DemoEnsayo" component={DemoEnsayo} durationInFrames={Math.floor(LINEA_ENSAYO.DURACION * FPS)} fps={FPS} width={1920} height={1080} />
  </Folder>
);
