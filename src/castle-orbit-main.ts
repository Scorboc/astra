import { mountCastleOrbit } from './components/CastleOrbit.ts';
import { withBase } from './asset-url.ts';

mountCastleOrbit(document.getElementById('castle-orbit-app')!, {
  standalone: true,
  exitLabel: '← В галактику',
  onExit: () => { location.href = withBase('/spatial/#galaxy'); },
});
