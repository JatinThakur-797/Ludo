package com.ludo.game.controller;

import com.ludo.game.dto.LudoRoom;
import com.ludo.game.dto.RoomSettings;
import com.ludo.game.security.UserPrincipal;
import com.ludo.game.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public ResponseEntity<LudoRoom> createRoom(@RequestBody(required = false) RoomSettings settings, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        UUID userId = null;
        String displayName = "Anonymous";

        if (principal instanceof UsernamePasswordAuthenticationToken) {
            UsernamePasswordAuthenticationToken token = (UsernamePasswordAuthenticationToken) principal;
            if (token.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) token.getPrincipal();
                userId = userPrincipal.getId();
                displayName = userPrincipal.getDisplayName();
            }
        }

        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        LudoRoom room = roomService.createRoom(userId, displayName, settings);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<LudoRoom> getRoom(@PathVariable String roomCode) {
        LudoRoom room = roomService.getRoom(roomCode);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(room);
    }
}
