
"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Mail } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { emojisOnWheel } from "@/constants/emojis"

export default function EmojiSpinner() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(true)
  const [email, setEmail] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Load or create session based on email
  const handleEmailSubmit = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      alert("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      // Check if session exists
      const { data: existingSession, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("email", emailInput.trim().toLowerCase())
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking session:", error)
        alert("Error connecting to database. Please try again.")
        return
      }

      if (existingSession) {
        // Load existing session
        setSelectedEmojis(existingSession.selected_emojis || [])
        toast({
          title: "¡Bienvenido de nuevo!",
          description: `Elegiste ${existingSession.selected_emojis?.length || 0} emojis.`,
          className: "bg-green-100 text-green-700 border-green-200",
        })
      } else {
        // Create new session
        const { error: insertError } = await supabase.from("game_sessions").insert({
          email: emailInput.trim().toLowerCase(),
          selected_emojis: [],
        })

        if (insertError) {
          console.error("Error creating session:", insertError)
          alert("Error creating session. Please try again.")
          return
        }

        setSelectedEmojis([])
        toast({
          title: "New game session created!",
          description: "Ready to start spinning the wheel!",
          className: "bg-blue-100 text-blue-700 border-blue-200",
        })
      }

      setEmail(emailInput.trim().toLowerCase())
      setShowEmailDialog(false)
    } catch (error) {
      console.error("Unexpected error:", error)
      alert("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Save session to database
  const saveSession = async (newSelectedEmojis: string[]) => {
    if (!email) return

    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          selected_emojis: newSelectedEmojis,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email)

      if (error) {
        console.error("Error saving session:", error)
      }
    } catch (error) {
      console.error("Unexpected error saving session:", error)
    }
  }

  const spinWheel = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setSelectedIndex(null)

    // Calculate random rotation (multiple full rotations + random position)
    const spins = 5 + Math.random() * 5 // 5-10 full rotations
    const finalPosition = Math.random() * 360
    const totalRotation = rotation + spins * 360 + finalPosition

    setRotation(totalRotation)

    // Calculate which segment the pointer lands on
    const segmentAngle = 360 / emojisOnWheel.length
    const normalizedAngle = (360 - (finalPosition % 360)) % 360
    const selectedSegment = Math.floor(normalizedAngle / segmentAngle)

    setTimeout(() => {
      setSelectedIndex(selectedSegment)
      const selectedEmoji = emojisOnWheel[selectedSegment].emoji

      // Only add to history if not already selected
      if (!selectedEmojis.includes(selectedEmoji)) {
        const newSelectedEmojis = [...selectedEmojis, selectedEmoji]
        setSelectedEmojis(newSelectedEmojis)
        saveSession(newSelectedEmojis) // Save to database
      }

      setIsSpinning(false)
      setShowModal(true)
    }, 3000)
  }

  const resetGame = async () => {
    const newSelectedEmojis: string[] = []
    setSelectedEmojis(newSelectedEmojis)
    setIsSpinning(false)
    setSelectedIndex(null)
    setRotation(0)
    setShowModal(false)

    // Save reset state to database
    await saveSession(newSelectedEmojis)
  }

  const changeUser = () => {
    setShowEmailDialog(true)
    setEmail("")
    setEmailInput("")
    setSelectedEmojis([])
    setRotation(0)
    setSelectedIndex(null)
    setShowModal(false)
  }

  const segmentAngle = 360 / emojisOnWheel.length

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-pink-100 via-pink-100 to-blue-100">
      <h1 className="md:mb-4 mb-2 text-4xl font-bold text-pink-500">Los Emojis de Bren</h1>

      {/* User info and change user button */}
      {email && (
        <div className="md:mb-6 mb-4 flex md:flex-row flex-col items-center justify-center md:gap-4 gap-2">
          <p className="text-pink-500 text-xs h-4 font-medium ">{email}</p>
          <div className="flex flex-row items-center justify-center md:gap-3 gap-1">
            <Button onClick={changeUser} variant="outline" size="sm" className="h-4 hover:bg-transparent hover:text-pink-500 text-pink-500 p-1 bg-transparent border-none text-xs">
              <Mail className="h-2 w-2" />
              Cambiar usuario
            </Button>
            <Button onClick={resetGame} variant="outline" size="sm" className=" h-4 hover:bg-transparent hover:text-pink-500 text-pink-500 p-1 bg-transparent border-none text-xs">
              <RefreshCw className="h-2 w-2" /> Reiniciar
            </Button>
          </div>
        </div>
      )}



      {/* Wheel container */}
      <div className="relative mb-6 md:mb-12">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-6 border-r-6 border-b-12 border-l-transparent border-r-transparent border-b-red-500 z-20"></div>

        {/* Wheel */}
        <div className="relative w-80 h-80 md:w-96 md:h-96">
          <motion.div
            className="w-full h-full rounded-full relative overflow-hidden shadow-2xl border-8 border-yellow-100"
            animate={{ rotate: rotation }}
            transition={{ duration: 3, ease: "easeOut" }}
          >
            {/* Wheel segments */}
            {emojisOnWheel.map((segment, index) => {
              const startAngle = index * segmentAngle
              const endAngle = (index + 1) * segmentAngle

              // Calculate the path for each segment
              const startAngleRad = (startAngle * Math.PI) / 180
              const endAngleRad = (endAngle * Math.PI) / 180

              const largeArcFlag = segmentAngle > 180 ? 1 : 0

              const x1 = 50 + 45 * Math.cos(startAngleRad)
              const y1 = 50 + 45 * Math.sin(startAngleRad)
              const x2 = 50 + 45 * Math.cos(endAngleRad)
              const y2 = 50 + 45 * Math.sin(endAngleRad)

              const pathData = [`M 50 50`, `L ${x1} ${y1}`, `A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2}`, `Z`].join(" ")

              // Calculate text position
              const textAngle = startAngle + segmentAngle / 2
              const textAngleRad = (textAngle * Math.PI) / 180
              const textX = 50 + 36 * Math.cos(textAngleRad)
              const textY = 50 + 36 * Math.sin(textAngleRad)

              return (
                <svg key={index} className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  <path
                    d={pathData}
                    fill="none"
                    className={selectedIndex === index ? "brightness-110" : ""}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-2xl"
                    style={{ fontSize: ".5rem" }}
                  >
                    {segment.emoji}
                  </text>
                </svg>
              )
            })}
          </motion.div>

          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full shadow-lg flex items-center justify-center border-4 border-white z-10">
            <Button className="bg-transparent border-none rounded-full" onClick={spinWheel}>
              <span className="text-2xl">🎯</span>
            </Button>
          </div>
        </div>
      </div>

      {/* History display */}
      <div className="w-full max-w-2xl">
        <h2 className="mb-4 md:text-2xl text-xl font-semibold text-pink-600 text-center">Hasta ahora ya elegiste</h2>
        <div className="">
          {selectedEmojis.length > 0 ? (
            <div className="flex flex-wrap gap-3 justify-center">
              {selectedEmojis.map((emoji, index) => (
                <motion.div
                  key={`history-${index}`}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-center w-10 h-10 text-xl md:w-14 md:h-14 md:text-3xl bg-gradient-to-br from-pink-100 to-pink-100 rounded-full shadow-md border-2 border-pink-200"
                >
                  {emoji}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic text-center text-lg">No emojis selected yet - spin the wheel!</p>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-4 text-center">
          <p className="text-pink-500 text-xs md:text-sm">
            Emojis: {selectedEmojis.length} / {emojisOnWheel.length}
          </p>
          <div className="w-full bg-pink-100 rounded-full md:h-3 h-2 md:mt-2 mt-1">
            <div
              className="bg-gradient-to-r from-pink-400 to-pink-400 md:h-3 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(selectedEmojis.length / emojisOnWheel.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {selectedEmojis.length === emojisOnWheel.length && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-6 p-4 bg-gradient-to-r from-pink-200 to-pink-200 rounded-lg shadow-lg"
        >
          <p className="text-center text-xl font-bold text-pink-700">
            🎉 Congratulations! You've selected all emojis! 🎉
          </p>
        </motion.div>
      )}

      {/* Email input dialog */}
      <Dialog open={showEmailDialog} onOpenChange={() => { }}>
        <DialogContent className="max-w-xs md:max-w-md bg-white border border-pink-100 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-pink-600 text-center">
              Hola!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600 text-center">
              Escribe tu email para guardar tu progreso y continuar donde lo dejaste.
            </p>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                className="border-pink-200 focus:border-pink-400"
              />
            </div>
            <Button
              onClick={handleEmailSubmit}
              disabled={isLoading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
            >
              {isLoading ? "Cargando..." : "Empezar a jugar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selection result modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xs md:max-w-md bg-white/95 backdrop-blur-sm border border-pink-100 shadow-lg p-8 rounded-xl">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center"
          >
            {/* Emoji display */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", duration: 0.4 }}
              className="text-7xl md:text-8xl mb-4"
            >
              {selectedIndex !== null ? emojisOnWheel[selectedIndex].emoji : ""}
            </motion.div>

            {/* Selection text */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-2xl font-bold text-pink-600 mb-2">¡Elegido!</h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedIndex !== null && !selectedEmojis.includes(emojisOnWheel[selectedIndex].emoji)
                  ? "New emoji added to your collection!"
                  : "You've already collected this one!"}
              </p>

              {/* Close button */}
              <Button
                onClick={() => setShowModal(false)}
                className="bg-pink-400 hover:bg-pink-500 text-white px-6 py-2 text-sm rounded-full"
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
