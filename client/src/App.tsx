import { Suspense, useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { GlobalTopBar } from "./core/GlobalTopBar";
import { EntryScreen, LobbyView } from "./core/LobbyView";
import { SoloTopBar } from "./core/SoloTopBar";
import { TauntOverlay } from "./core/TauntOverlay";
import { useGameSocket } from "./core/useGameSocket";
import { getGameComponent } from "./games/registry";
import { getSoloGame } from "./games/soloRegistry";

function getInitialSoloGameId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("room")) return null;
  const soloParam = params.get("solo")?.trim();
  return soloParam && getSoloGame(soloParam) ? soloParam : null;
}

function syncSoloQueryParam(gameId: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (gameId) {
    url.searchParams.set("solo", gameId);
    url.searchParams.delete("room");
  } else {
    url.searchParams.delete("solo");
  }
  window.history.replaceState({}, "", url.toString());
}

export function App() {
  const [activeSoloGameId, setActiveSoloGameId] = useState<string | null>(() =>
    getInitialSoloGameId()
  );

  const {
    status,
    playerId,
    room,
    gameView,
    lastEvents,
    taunts,
    errorBanner,
    resumingRoomId,
    joinRoom,
    leaveRoom,
    setStake,
    selectGame,
    setReady,
    startMatch,
    returnToLobby,
    sendGameAction,
    sendTaunt,
  } = useGameSocket();

  const currentUrlRoomCode = !room
    ? (new URLSearchParams(window.location.search).get("room") ?? "").toUpperCase()
    : "";

  const ActiveGameBoard = room ? getGameComponent(room.selectedGameId) : null;
  const activeSoloGame = !room && activeSoloGameId ? getSoloGame(activeSoloGameId) : null;

  const startSoloGame = (gameId: string) => {
    if (!getSoloGame(gameId)) return;
    syncSoloQueryParam(gameId);
    setActiveSoloGameId(gameId);
  };

  const exitSoloGame = () => {
    syncSoloQueryParam(null);
    setActiveSoloGameId(null);
  };

  const handleJoinRoom = (roomId: string, playerName: string) => {
    syncSoloQueryParam(null);
    setActiveSoloGameId(null);
    joinRoom(roomId, playerName);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="table-room-bg min-h-dvh pb-[env(safe-area-inset-bottom)] text-[#ebe5d8]">
        {errorBanner && (
          <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-[#d9483b]/60 bg-[#231413]/95 px-4 py-2.5 text-center text-xs font-medium text-[#f5b4ae] shadow-xl">
            {errorBanner}
          </div>
        )}

        <TauntOverlay taunts={taunts} myPlayerId={playerId} />

        {!room ? (
          activeSoloGame ? (
            <>
              <SoloTopBar
                title={activeSoloGame.name}
                badge={activeSoloGame.badge}
                onExit={exitSoloGame}
              />
              <Suspense
                fallback={
                  <div className="flex min-h-[60dvh] items-center justify-center text-sm text-[#9c9689]">
                    Memuat game solo...
                  </div>
                }
              >
                <activeSoloGame.Component onExit={exitSoloGame} />
              </Suspense>
            </>
          ) : resumingRoomId &&
            (status === "connecting" || status === "reconnecting") ? (
            <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
              <div className="space-y-1.5">
                <p className="font-display text-2xl text-[#ebe5d8]">
                  Meja{" "}
                  <span className="font-mono-tabular text-[#d4a24c]">
                    {resumingRoomId}
                  </span>
                </p>
                <p className="text-sm text-[#9c9689]">
                  Menyambungkan kembali ke sesi permainan...
                </p>
              </div>
              <button
                type="button"
                onClick={leaveRoom}
                className="min-h-[44px] rounded-lg border border-white/12 bg-[#171815] px-5 py-2.5 text-xs text-[#9c9689] hover:text-[#ebe5d8] transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <EntryScreen
              initialRoomCode={currentUrlRoomCode}
              status={status}
              onJoin={handleJoinRoom}
              onStartSolo={startSoloGame}
            />
          )
        ) : (
          <>
            <GlobalTopBar
              room={room}
              playerId={playerId}
              status={status}
              onSendTaunt={sendTaunt}
              onLeaveRoom={leaveRoom}
            />

            {room.phase === "LOBBY" ? (
              <LobbyView
                room={room}
                playerId={playerId}
                onSetStake={setStake}
                onSelectGame={selectGame}
                onSetReady={setReady}
                onStartMatch={startMatch}
              />
            ) : ActiveGameBoard ? (
              <Suspense
                fallback={
                  <div className="flex min-h-[60dvh] items-center justify-center text-sm text-[#9c9689]">
                    Memuat game...
                  </div>
                }
              >
                <ActiveGameBoard
                  view={gameView}
                  room={room}
                  playerId={playerId}
                  lastEvents={lastEvents}
                  onAction={sendGameAction}
                  onSetReady={setReady}
                  onStartMatch={startMatch}
                  onReturnToLobby={returnToLobby}
                />
              </Suspense>
            ) : (
              <div className="py-16 text-center text-sm text-[#9c9689]">
                Game &ldquo;{room.selectedGameId}&rdquo; belum tersedia.
              </div>
            )}
          </>
        )}
      </div>
    </LazyMotion>
  );
}

export default App;
