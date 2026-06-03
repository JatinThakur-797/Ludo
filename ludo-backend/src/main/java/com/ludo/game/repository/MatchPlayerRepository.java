package com.ludo.game.repository;

import com.ludo.game.model.entity.MatchPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface MatchPlayerRepository extends JpaRepository<MatchPlayer, UUID> {
    List<MatchPlayer> findByMatchId(UUID matchId);

    @Query("SELECT mp FROM MatchPlayer mp JOIN FETCH mp.match m WHERE mp.user.id = :userId ORDER BY m.endTime DESC")
    List<MatchPlayer> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT mp FROM MatchPlayer mp JOIN FETCH mp.user u WHERE mp.match.id IN :matchIds")
    List<MatchPlayer> findByMatchIdIn(@Param("matchIds") Collection<UUID> matchIds);
}
