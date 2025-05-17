import React, {
    useState,
    useEffect,
    useRef,
    type MouseEvent as ReactMouseEvent,
    type TouchEvent as ReactTouchEvent
} from 'react';

interface Track {
    id: number;
    title: string;
    artist: string;
    cover: string;
    url: string;
}

const tracksData: Track[] = [
    {
        id: 1,
        title: "Smooth Criminal",
        artist: "Michael Jackson",
        cover: "/images/Smooth_criminal.jpg",
        url: "/sounds/Michael Jackson - Smooth Criminal (Single Version) HD.mp3",
    },
    {
        id: 2,
        title: "The emptiness machine",
        artist: "Linkin Park",
        cover: "/images/Emptiness_machine.jpg",
        url: "/sounds/The Emptiness Machine (Official Music Video) - Linkin Park.mp3",
    },
];

const Player: React.FC = () => {
    const [tracks] = useState<Track[]>(tracksData);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0.5);
    const [previousVolume, setPreviousVolume] = useState<number>(0.5);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isPlaylistVisible, setIsPlaylistVisible] = useState<boolean>(false);
    const [isDraggingProgress, setIsDraggingProgress] = useState<boolean>(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volumeBarRef = useRef<HTMLDivElement>(null);

    const currentTrack = tracks[currentTrackIndex];

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(error => console.error("Error playing audio:", error));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        const updateCurrentTime = () => {
            if (audio) setCurrentTime(audio.currentTime);
        };
        const updateDuration = () => {
            if (audio && audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration);
            } else {
                setDuration(0); // Reset or handle invalid duration
            }
        };

        if (audio) {
            audio.addEventListener('timeupdate', updateCurrentTime);
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('durationchange', updateDuration); // Ensure duration updates if it changes

            audio.src = currentTrack.url;
            audio.load();
            if (isPlaying) {
                audio.play().catch(error => console.error("Error playing audio on track change:", error));
            }

            return () => {
                audio.removeEventListener('timeupdate', updateCurrentTime);
                audio.removeEventListener('loadedmetadata', updateDuration);
                audio.removeEventListener('durationchange', updateDuration);
            };
        }
    }, [currentTrackIndex, currentTrack.url, isPlaying]);

    const formatTime = (timeInSeconds: number): string => {
        if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) return "0:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const playNextTrack = () => {
        setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % tracks.length);
    };

    const playPrevTrack = () => {
        setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + tracks.length) % tracks.length);
    };

    const handleInteraction = (
        event: ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement> | globalThis.MouseEvent | globalThis.TouchEvent,
        barRef: React.RefObject<HTMLDivElement | null>,
        setValue: (value: number) => void,
        audioProperty?: 'currentTime' | 'volume'
    ) => {
        if (!barRef.current) return;
        const barRect = barRef.current.getBoundingClientRect();
        let clientXValue: number;

        if ('touches' in event && (event as globalThis.TouchEvent).touches.length > 0) {
            clientXValue = (event as globalThis.TouchEvent).touches[0].clientX;
        } else {
            clientXValue = (event as globalThis.MouseEvent).clientX;
        }

        let positionInBar = clientXValue - barRect.left;
        positionInBar = Math.max(0, Math.min(positionInBar, barRect.width));
        const percentage = positionInBar / barRect.width;

        if (audioProperty && audioRef.current) {
            const effectiveMaxAudioValue = audioProperty === 'currentTime' ? audioRef.current.duration : 1;
            if (isFinite(effectiveMaxAudioValue) && effectiveMaxAudioValue > 0) {
                const newValue = percentage * effectiveMaxAudioValue;
                if (audioProperty === 'currentTime') {
                    if (audioRef.current.fastSeek) {
                        audioRef.current.fastSeek(newValue);
                    } else {
                        audioRef.current.currentTime = newValue;
                    }
                    setValue(newValue); // Update React state for currentTime
                } else {
                    audioRef.current[audioProperty] = newValue;
                    setValue(newValue); // Update React state for volume
                }
            }
        } else {
            setValue(percentage); // Fallback or for non-audio properties
        }
    };

    const toggleMute = () => {
        if (volume > 0) {
            setPreviousVolume(volume);
            setVolume(0);
        } else {
            setVolume(previousVolume > 0 ? previousVolume : 0.1);
        }
    };

    const togglePlaylist = () => {
        setIsPlaylistVisible(!isPlaylistVisible);
    };

    const selectTrackFromPlaylist = (index: number) => {
        setCurrentTrackIndex(index);
        setIsPlaying(true);
    };

    useEffect(() => {
        const handleInteractionMove = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
            if (isDraggingProgress) {
                handleInteraction(event, progressBarRef, setCurrentTime, 'currentTime');
            }
            if (isDraggingVolume) {
                handleInteraction(event, volumeBarRef, setVolume, 'volume');
            }
        };
        const handleInteractionEnd = () => {
            if (isDraggingProgress) setIsDraggingProgress(false);
            if (isDraggingVolume) setIsDraggingVolume(false);
            document.body.classList.remove('dragging');
        };

        if (isDraggingProgress || isDraggingVolume) {
            document.body.classList.add('dragging');
            document.addEventListener('mousemove', handleInteractionMove as EventListener);
            document.addEventListener('mouseup', handleInteractionEnd);
            document.addEventListener('touchmove', handleInteractionMove as EventListener);
            document.addEventListener('touchend', handleInteractionEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleInteractionMove as EventListener);
            document.removeEventListener('mouseup', handleInteractionEnd);
            document.removeEventListener('touchmove', handleInteractionMove as EventListener);
            document.removeEventListener('touchend', handleInteractionEnd);
            if (document.body.classList.contains('dragging')) {
                document.body.classList.remove('dragging');
            }
        };
    }, [isDraggingProgress, isDraggingVolume, duration]); // Added duration as dependency for progress updates

    const startDragging = (
        event: ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement>,
        setDraggingState: (isDragging: boolean) => void,
        barRef: React.RefObject<HTMLDivElement | null>,
        setValue: (value: number) => void,
        audioProperty?: 'currentTime' | 'volume'
    ) => {
        event.preventDefault();
        setDraggingState(true);
        handleInteraction(event.nativeEvent || event, barRef, setValue, audioProperty);
    }

    const progressPercent = duration && duration > 0 ? (currentTime / duration) * 100 : 0;
    const volumePercent = volume * 100;

    return (
        <div className="player">
            {isPlaylistVisible && (
                <div className="playlist-container">
                    <h3>Playlist</h3>
                    <div className="playlist-items">
                        {tracks.map((track, index) => (
                            <div
                                key={track.id}
                                className={`playlist-item ${index === currentTrackIndex ? 'active-track' : ''}`}
                                onClick={() => selectTrackFromPlaylist(index)}
                            >
                                <img src={track.cover} alt={track.title} className="playlist-item-cover" />
                                <div className="playlist-item-info">
                                    <div className="playlist-item-title">{track.title}</div>
                                    <div className="playlist-item-artist">{track.artist}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="card-song">
                <div className="upperPart-container">
                    <div className="cover">
                        <img id="cover-image" src={currentTrack.cover} alt={currentTrack.title} />
                    </div>
                    <button className="playlist-button" onClick={togglePlaylist} aria-label="Toggle Playlist">
                        <svg className="playlist-icon" viewBox="0 0 19 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0H0V2H12V0ZM12 4H0V6H12V4ZM0 10H8V8H0V10ZM14 0V8.18C13.69 8.07 13.35 8 13 8C12.2044 8 11.4413 8.31607 10.8787 8.87868C10.3161 9.44129 10 10.2044 10 11C10 11.7956 10.3161 12.5587 10.8787 13.1213C11.4413 13.6839 12.2044 14 13 14C13.7956 14 14.5587 13.6839 15.1213 13.1213C15.6839 12.5587 16 11.7956 16 11V2H19V0H14Z" fill="currentColor" />
                        </svg>
                    </button>
                </div>
                <audio ref={audioRef} id="audio-player" preload="metadata">
                    {/* Source is set dynamically in useEffect */}
                </audio>
                <div className="info">
                    <h2 id="track-title" className="title">{currentTrack.title}</h2>
                    <h3 id="track-artist" className="artist">{currentTrack.artist}</h3>
                </div>
            </div>

            <div className="controls">
                <button className="prev-button" onClick={playPrevTrack} aria-label="Previous Track">
                    <svg className="prev-icon" width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 20L9 12L19 4V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button className="play-button" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? (
                        <svg className="pause-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2m-1 14H9V8h2zm4 0h-2V8h2z" />
                        </svg>
                    ) : (
                        <svg className="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m-2 14.5v-9l6 4.5z" />
                        </svg>
                    )}
                </button>
                <button className="next-button" onClick={playNextTrack} aria-label="Next Track">
                    <svg className="next-icon" viewBox="0 0 24 28" width="24" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 4L15 12L5 20V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <section
                className="progress-container"
                ref={progressBarRef}
                onClick={(e) => !isDraggingProgress && handleInteraction(e, progressBarRef, setCurrentTime, 'currentTime')}
                onMouseDown={(e) => startDragging(e, setIsDraggingProgress, progressBarRef, setCurrentTime, 'currentTime')}
                onTouchStart={(e) => startDragging(e, setIsDraggingProgress, progressBarRef, setCurrentTime, 'currentTime')}
            >
                <div className="progress-bar" style={{ width: `${progressPercent}%` }}>
                    <div className="progress-handle" style={{ left: `${progressPercent}%` }}></div>
                </div>
            </section>
            <div className="time">
                <span id="current-time">{formatTime(currentTime)}</span>
                <span id="duration">{formatTime(duration)}</span>
            </div>

            <div className="volume-container">
                <div className="volume-controls">
                    <button className="volume-button" onClick={toggleMute} aria-label={volume === 0 ? "Unmute" : "Mute"}>
                        {volume === 0 && (
                            <svg className="volume-muted" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 9a5 5 0 0 1 .95 2.293m2.414-5.657a9 9 0 0 1 1.889 9.96M2 2l20 20M7 7l-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11M9.828 4.172A.686.686 0 0 1 11 4.657v.686" />
                            </svg>
                        )}
                        {volume > 0 && volume <= 0.5 && (
                            <svg className="volume-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298zM16 9a5 5 0 0 1 0 6" />
                            </svg>
                        )}
                        {volume > 0.5 && (
                            <svg className="volume-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298zM16 9a5 5 0 0 1 0 6m3.364 3.364a9 9 0 0 0 0-12.728" />
                            </svg>
                        )}
                    </button>
                    <div
                        className="volume-bar"
                        ref={volumeBarRef}
                        onClick={(e) => !isDraggingVolume && handleInteraction(e, volumeBarRef, setVolume, 'volume')}
                        onMouseDown={(e) => startDragging(e, setIsDraggingVolume, volumeBarRef, setVolume, 'volume')}
                        onTouchStart={(e) => startDragging(e, setIsDraggingVolume, volumeBarRef, setVolume, 'volume')}
                    >
                        <div className="volume-progress" style={{ width: `${volumePercent}%` }}></div>
                        <div className="volume-handle" style={{ left: `${volumePercent}%` }}></div>
                    </div>
                    <span id="volume">{`${Math.round(volumePercent)}%`}</span>
                </div>
            </div>
        </div>
    );
};

export default Player;

