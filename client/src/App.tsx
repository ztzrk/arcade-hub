import { useMemo } from "react";
import { GlobalTopBar } from "./core/GlobalTopBar";
import { EntryScreen, LobbyView } from "./core/LobbyView";
import { TauntOverlay } from "./core/TauntOverlay";
import { useGameSocket } from "./core/useGameSocket";
import { getGameComponent } from "./games/registry";

export function App() {
  const initialRoomCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("room") ?? "").toUpperCase();
  }, []);

  const {
    status,
    playerId,
    room,
    gameView,
    lastEvents,
    taunts,
    errorBanner,
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

  const ActiveGameBoard = room ? getGameComponent(room.selectedGameId) : null;

  return (
    <div className="table-room-bg min-h-screen text-[#ebe5d8]">
      {errorBanner && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#d9483b]/60 bg-[#231413]/95 px-4 py-2 text-xs font-medium text-[#f5b4ae] shadow-xl">
          {errorBanner}
        </div>
      )}

      <TauntOverlay taunts={taunts} myPlayerId={playerId} />

      {!room ? (
        <EntryScreen
          initialRoomCode={initialRoomCode}
          status={status}
          onJoin={joinRoom}
        />
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
          ) : (
            <div className="py-16 text-center text-sm text-[#9c9689]">
              Game &ldquo;{room.selectedGameId}&rdquo; belum tersedia.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
