import { GlobalTopBar } from "./core/GlobalTopBar";
import { EntryScreen, LobbyView } from "./core/LobbyView";
import { TauntOverlay } from "./core/TauntOverlay";
import { useGameSocket } from "./core/useGameSocket";
import { getGameComponent } from "./games/registry";

export function App() {
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

  return (
    <div className="table-room-bg min-h-dvh pb-[env(safe-area-inset-bottom)] text-[#ebe5d8]">
      {errorBanner && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-[#d9483b]/60 bg-[#231413]/95 px-4 py-2.5 text-center text-xs font-medium text-[#f5b4ae] shadow-xl">
          {errorBanner}
        </div>
      )}

      <TauntOverlay taunts={taunts} myPlayerId={playerId} />

      {!room ? (
        resumingRoomId && (status === "connecting" || status === "reconnecting") ? (
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
            onJoin={joinRoom}
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
