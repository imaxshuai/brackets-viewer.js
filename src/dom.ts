import { Match, ParticipantResult } from 'brackets-model';
import { Connection, FinalType, BracketType, Placement, Ranking, RankingItem } from './types';
import { rankingHeader } from './helpers';
import { t } from './lang';

/**
 * Creates the title of the viewer.
 *
 * @param title The title to set.
 */
export function createTitle(title: string): HTMLElement {
    const h1 = document.createElement('h1');
    h1.innerText = title;
    return h1;
}

/**
 * Creates the tools of the viewer.
 *
 */
export function createTools(screenshot?: () => void): HTMLElement {
    const box = document.createElement('div');
    box.classList.add("tools");
    
    const toolsBox = document.createElement('div');
    toolsBox.classList.add("actions");
    toolsBox.classList.add("d-flex");
    
    const screenshotBox = document.createElement('div');
    screenshotBox.innerHTML = `
        <div class="btn screenshot"><i class="fa-solid fa-image"></i></div>
    `;
    screenshot && screenshotBox.addEventListener('click', screenshot);
    
    toolsBox.append(screenshotBox);
    box.append(toolsBox);
    
    return box;
}

/**
 * Creates a container which contains a round-robin stage.
 *
 * @param stageId ID of the stage.
 */
export function createRoundRobinContainer(stageId: number): HTMLElement {
    const stage = document.createElement('div');
    stage.classList.add('round-robin');
    stage.setAttribute('data-stage-id', stageId.toString());
    return stage;
}

/**
 * Creates a container which contains an elimination stage.
 *
 * @param stageId ID of the stage.
 * @param width
 * @param height
 */
export function createEliminationContainer(stageId: number, width?: number, height?: number): HTMLElement {
    const box = document.createElement('div');
    box.style.setProperty('position', 'relative');
    const stage = document.createElement('div');
    stage.classList.add('elimination');
    stage.setAttribute('data-stage-id', stageId.toString());
    if (width) stage.style.setProperty('height', width + 'px');
    if (height) stage.style.setProperty('height', height + 'px');
    box.appendChild(stage);
    return stage;
}

/**
 * Creates a container which contains one bracket of a single or double elimination stage.
 *
 * @param groupId ID of the group.
 * @param title Title of the group.
 */
export function createBracketContainer(groupId: number, title?: string): HTMLElement {
    const bracket = document.createElement('section');
    bracket.classList.add('bracket');
    bracket.setAttribute('data-group-id', groupId.toString());

    if (title) {
        const h2 = document.createElement('h2');
        h2.innerText = title;
        bracket.append(h2);
    }

    return bracket;
}

/**
 * Creates a container which contains a group for round-robin stages.
 *
 * @param groupId ID of the group.
 * @param title Title of the group.
 */
export function createGroupContainer(groupId: number, title: string): HTMLElement {
    const h2 = document.createElement('h2');
    h2.innerText = title;

    const group = document.createElement('section');
    group.classList.add('group');
    group.setAttribute('data-group-id', groupId.toString());
    group.append(h2);
    return group;
}

/**
 * Creates a container which contains a list of rounds.
 */
export function createRoundsContainer(): HTMLElement {
    const round = document.createElement('div');
    round.classList.add('rounds');
    return round;
}

/**
 * Creates a container which contains a round.
 *
 * @param roundId ID of the round.
 * @param title Title of the round.
 * @param onClick
 * @param percent of the round.
 * @param played_at of the round.
 */
export function createRoundContainer(roundId: number, title: string, percent?: string, played_at?: string, onClick?: () => void): HTMLElement {
    const h3 = document.createElement('h3');
    // h3.innerText = title;
    h3.innerHTML = `
    <div class="title"> ${title}</div>
    <div class="triangle_box">
        <div class="triangle"></div>
        <div class="triangle r"></div>
    </div>
    <div class="timer d-flex align-items-center">
        <div style="background-color: #1e1e2d; color: #5e5e7d; padding-left: 10px">
            <i class="fa-solid fa-clock"></i>
            <span style="padding: 0 6px">${played_at ?? '--'}</span>
        </div>
        <div class="triangle" style="border-color: #1e1e2d transparent; border-width: 0 20px 20px 0;"></div>
    </div>
    <div class="progress">${percent ?? '--'}</div>
    `;
    onClick && h3.addEventListener('click', onClick);

    const round = document.createElement('article');
    round.classList.add('round');
    round.setAttribute('data-round-id', roundId.toString());
    round.append(h3);
    return round;
}

/**
 * Creates a container which contains a match.
 *
 * @param matchId ID of the match.
 * @param status Status of the match.
 */
export function createMatchContainer(matchId?: number, status?: number): HTMLElement {
    const match = document.createElement('div');
    match.classList.add('match');
    matchId !== undefined && match.setAttribute('data-match-id', matchId.toString());
    status !== undefined && match.setAttribute('data-match-status', status.toString());
    return match;
}

/**
 *
 * @param ext
 */
export function createMatchStatus(ext: Array<any>): HTMLElement {
    console.log(ext);
    const statusBox = document.createElement('div');
    statusBox.classList.add('d-flex');
    statusBox.classList.add('status_box');
    
    // language=HTML
    statusBox.innerHTML = `
        <div class="status d-flex align-items-center"
            style="background-color: ${ext[0].style?.bgColor ?? '#5121ed'}; color: ${ext[0].style?.color ?? '#fff'};">
            ${ext[0].dot ? `<div class="dot" style="background-color: ${ext[0].style?.color ?? '#5121ed'};"></div>` : ''}
            <span>${ext[0].text ?? '--'}</span>
        </div>
        <div class="position-relative" style="width: 24px;">
            <div class="triangle" style="border-color: ${ext[0].style?.bgColor ?? '#1e1e2d'} transparent; border-width: 0 20px 20px 0;"></div>
            ${ ext[1] ? `<div class="triangle position-absolute"
                style="border-color: ${ext[1].style?.bgColor ?? '#5121ed'} transparent; border-width: 20px 0 0 20px; right: 0; top: 0;">
                </div>` : '' }
        </div>
        ${ ext[1] ? `<div class="status"
            style="background-color: ${ext[1].style?.bgColor ?? '#5121ed'}; color: ${ext[1].style?.color ?? '#fff'};">
            <span>${ext[1].text}</span>
            <i class="fa-solid fa-caret-right" style="color: ${ext[1].style?.color ?? '#fff'};"></i>
        </div>` : '' }
        
        ${ ext[1] ? `<div class="triangle" style="border-color: ${ext[1].style?.bgColor ?? '#5121ed'} transparent; border-width: 0 20px 20px 0;"></div>` : '' }
    `;
    return statusBox;
}

/**
 * Creates a container which contains the label of a match.
 *
 * @param label The label of the match.
 * @param status The status to set as tooltip.
 */
export function createMatchLabel(label: string, status: string): HTMLElement {
    const span = document.createElement('span');
    span.innerText = label;
    span.title = status;
    return span;
}

/**
 * Creates a container which contains the child count label of a match.
 *
 * @param label The child count label of the match.
 */
export function createChildCountLabel(label: string): HTMLElement {
    const span = document.createElement('span');
    span.innerText = label;
    return span;
}

/**
 * Creates a container which contains the opponents of a match.
 *
 * @param onClick Called when the match is clicked.
 */
export function createOpponentsContainer(onClick?: () => void): HTMLElement {
    const opponents = document.createElement('div');
    opponents.classList.add('opponents');
    onClick && opponents.addEventListener('click', onClick);
    return opponents;
}

/**
 * Creates a container which contains a participant.
 *
 * @param participantId ID of the participant.
 * @param showMark ID of the participant.
 */
export function createParticipantContainer(participantId: number | null, showMark?: boolean): HTMLElement {
    const participant = document.createElement('div');
    participant.classList.add('participant');
    if (showMark)
        participant.innerHTML = '<div class="win_mark"><i class="fas fa-chess-rook"></i></div>';
    
    if (participantId !== null && participantId !== undefined)
        participant.setAttribute('data-participant-id', participantId.toString());

    return participant;
}

/**
 * Creates a container which contains the name of a participant.
 */
export function createNameContainer(): HTMLElement {
    const name = document.createElement('div');
    name.classList.add('name');
    return name;
}

/**
 * Creates a container which contains the result of a match for a participant.
 */
export function createResultContainer(): HTMLElement {
    const result = document.createElement('div');
    result.classList.add('result');
    return result;
}

/**
 * Creates a table.
 */
export function createTable(): HTMLElement {
    return document.createElement('table');
}

/**
 * Creates a table row.
 */
export function createRow(): HTMLElement {
    return document.createElement('tr');
}

/**
 * Creates a table cell.
 *
 * @param data The data in the cell.
 */
export function createCell(data: string | number): HTMLElement {
    const td = document.createElement('td');
    td.innerText = String(data);
    return td;
}

/**
 * Creates the headers for a ranking table.
 *
 * @param ranking The object containing the ranking.
 */
export function createRankingHeaders(ranking: Ranking): HTMLElement {
    const headers = document.createElement('tr');
    const firstItem = ranking[0];

    for (const key in firstItem) {
        const prop = key as keyof RankingItem;
        const header = rankingHeader(prop);
        const th = document.createElement('th');
        th.innerText = header.text;
        th.setAttribute('title', header.tooltip);
        headers.append(th);
    }

    return headers;
}

/**
 * Sets a hint on a name container.
 *
 * @param nameContainer The name container.
 * @param hint The hint to set.
 */
export function setupHint(nameContainer: HTMLElement, hint: string): void {
    nameContainer.classList.add('hint');
    nameContainer.innerText = hint;
}

/**
 * Sets a BYE on a name container.
 *
 * @param nameContainer The name container.
 */
export function setupBye(nameContainer: HTMLElement): void {
    nameContainer.innerText = t('common.bye');
    nameContainer.classList.add('bye');
}


/**
 * Sets a win for a participant.
 *
 * @param participantContainer The participant container.
 * @param resultContainer The result container.
 * @param participant The participant result.
 */
export function setupWin(participantContainer: HTMLElement, resultContainer: HTMLElement, participant: ParticipantResult): void {
    if (participant.result && participant.result === 'win') {
        participantContainer.classList.add('win');
        const bgLinear = document.createElement('div');
        bgLinear.classList.add('bg-linear');
        participantContainer.appendChild(bgLinear);
        // console.log(participantContainer.getElementsByClassName('win_mark').classList.add('win'));
        
        
        if (participant.score === undefined)
            resultContainer.innerText = t('abbreviations.win');
    }
}

/**
 * Sets a loss for a participant.
 *
 * @param participantContainer The participant container.
 * @param resultContainer The result container.
 * @param participant The participant result.
 */
export function setupLoss(participantContainer: HTMLElement, resultContainer: HTMLElement, participant: ParticipantResult): void {
    if (participant.result && participant.result === 'loss' || participant.forfeit) {
        participantContainer.classList.add('loss');

        if (participant.forfeit)
            resultContainer.innerText = t('abbreviations.forfeit');
        else if (participant.score === undefined)
            resultContainer.innerText = t('abbreviations.loss');
    }
}

/**
 * Adds the participant origin to a name.
 *
 * @param nameContainer The name container.
 * @param text The text to set (origin).
 * @param placement The placement of the participant origin.
 */
export function addParticipantOrigin(nameContainer: HTMLElement, text: string, placement: Placement): void {
    const div = document.createElement('div');
    div.classList.add('order-num');
    if (placement === 'before') {
        div.innerText = `${text} `;
        nameContainer.prepend(div);
    } else if (placement === 'after') {
        div.innerText = ` (${text})`;
        nameContainer.append(div);
    }
}

/**
 * Adds the participant image to a name.
 *
 * @param nameContainer The name container.
 * @param src Source of the image.
 */
export function addParticipantImage(nameContainer: HTMLElement, src: string): void {
    const img = document.createElement('img');
    img.src = src;
    nameContainer.prepend(img);
}

/**
 * Returns the connection for a given round in a bracket.
 *
 * @param alwaysConnectFirstRound Whether to always connect the first round with the second round.
 * @param roundNumber Number of the round.
 * @param roundCount Count of rounds.
 * @param match The match to connect to other matches.
 * @param matchLocation Location of the match.
 * @param connectFinal Whether to connect to the final.
 */
export function getBracketConnection(alwaysConnectFirstRound: boolean, roundNumber: number, roundCount: number, match: Match, matchLocation?: BracketType, connectFinal?: boolean): Connection {
    const connection: Connection = {
        connectPrevious: false,
        connectNext: false,
    };

    if (matchLocation === 'loser-bracket') {
        connection.connectPrevious = roundNumber > 1 && (roundNumber % 2 === 1 ? 'square' : 'straight');
        connection.connectNext = roundNumber < roundCount && (roundNumber % 2 === 0 ? 'square' : 'straight');
    } else {
        connection.connectPrevious = roundNumber > 1 && 'square';
        connection.connectNext = roundNumber < roundCount ? 'square' : (connectFinal ? 'straight' : false);
    }

    if (alwaysConnectFirstRound || roundNumber !== 2)
        return connection;

    const upperBracket = matchLocation === 'single-bracket' || matchLocation === 'winner-bracket';

    if (upperBracket && match.opponent1?.position === undefined && match.opponent2?.position === undefined)
        connection.connectPrevious = false;

    if (matchLocation === 'loser-bracket' && match.opponent2?.position === undefined)
        connection.connectPrevious = false;

    return connection;
}

/**
 * Returns the connection for a given round in the final.
 *
 * @param finalType Type of final.
 * @param roundNumber Number of the round.
 * @param matchCount The count of matches.
 */
export function getFinalConnection(finalType: FinalType, roundNumber: number, matchCount: number): Connection {
    return {
        connectPrevious: finalType === 'grand_final' && (roundNumber === 1 && 'straight'),
        connectNext: matchCount === 2 && roundNumber === 1 && 'straight',
    };
}

/**
 * Sets the connection a match containers.
 *
 * @param opponentsContainer The opponents container.
 * @param matchContainer The match container.
 * @param connection The connection to set.
 */
export function setupConnection(opponentsContainer: HTMLElement, matchContainer: HTMLElement, connection: Connection): void {
    if (connection.connectPrevious)
        opponentsContainer.classList.add('connect-previous');

    if (connection.connectNext)
        matchContainer.classList.add('connect-next');

    if (connection.connectPrevious === 'straight')
        opponentsContainer.classList.add('straight');

    if (connection.connectNext === 'straight')
        matchContainer.classList.add('straight');
}
