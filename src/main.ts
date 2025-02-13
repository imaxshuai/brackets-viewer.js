import './style.scss';
import { Participant, Match, ParticipantResult, Stage, Status, Round } from 'brackets-model';
import { splitBy, getRanking, findRoot, completeWithBlankMatches } from './helpers';
import * as dom from './dom';
import * as lang from './lang';
import { Locale } from './lang';
// @ts-ignore
import ScrollBooster from 'scrollbooster';
import html2canvas from 'html2canvas'
import {
    Config,
    Connection,
    FinalType,
    BracketType,
    OriginHint,
    ParticipantContainers,
    RankingItem,
    RoundName,
    ViewerData,
    ParticipantImage,
    Side,
    MatchClickCallback,
    RoundClickCallback,
} from './types';
import {createMatchStatus} from './dom';

export class BracketsViewer {

    readonly participantRefs: Record<number, HTMLElement[]> = {};

    private participants: Participant[] = [];
    private rounds: Round[] = [];
    private participantImages: ParticipantImage[] = [];

    private stage!: Stage;
    private config!: Config;
    private skipFirstRound = false;
    private alwaysConnectFirstRound = false;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _onMatchClick: MatchClickCallback = (match: Match): void => { };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _onRoundClick: RoundClickCallback = (round: Round): void => { };

    /**
     * @deprecated
     * @param callback A callback to be called when a match is clicked.
     */
    public set onMatchClicked(callback: MatchClickCallback) {
        this._onMatchClick = callback;
    }

    /**
     * @deprecated
     * @param callback A callback to be called when a match is clicked.
     */
    public set onRoundClicked(callback: RoundClickCallback) {
        this._onRoundClick = callback;
    }

    /**
     * Renders data generated with `brackets-manager.js`. If multiple stages are given, they will all be displayed.
     *
     * Stages won't be discriminated visually based on the tournament they belong to.
     *
     * @param data The data to display.
     * @param config An optional configuration for the viewer.
     */
    public async render(data: ViewerData, config?: Partial<Config>): Promise<void> {
        const root = document.createDocumentFragment();

        this.config = {
            participantOriginPlacement: config?.participantOriginPlacement || 'before',
            separatedChildCountLabel: config?.separatedChildCountLabel !== undefined ? config.separatedChildCountLabel : false,
            showSlotsOrigin: config?.showSlotsOrigin !== undefined ? config.showSlotsOrigin : true,
            showTitle: config?.showTitle !== undefined ? config.showTitle : true,
            showTools: config?.showTools !== undefined ? config.showTools : true,
            showLowerBracketSlotsOrigin: config?.showLowerBracketSlotsOrigin !== undefined ? config.showLowerBracketSlotsOrigin : true,
            highlightParticipantOnHover: config?.highlightParticipantOnHover !== undefined ? config.highlightParticipantOnHover : true,
            width: config?.width,
            height: config?.height,
        };

        if (this.config.onMatchClick)
            this._onMatchClick = this.config.onMatchClick;

        if (this.config.onRoundClick)
            this._onRoundClick = this.config.onRoundClick;

        this.participants = data.participants;
        this.rounds = data.rounds;

        data.participants.forEach(participant => this.participantRefs[participant.id] = []);

        data.stages.forEach(stage => this.renderStage(root, {
            ...data,
            stages: [stage],
            matches: data.matches.filter(match => match.stage_id === stage.id),
        }));

        findRoot(config?.selector).append(root);
    
        new ScrollBooster({
            viewport: document.querySelector(`${config?.selector}`),
            scrollMode: 'native',
            emulateScroll: false,
        });
    }
    
    /**
     * Update tools on panel.
     *
     */
    public updateTools(): void{
        console.log(123);
    }
    
    /**
     * Screenshot.
     */
    public screenshot(): void {
        html2canvas(document.querySelector('.bracket')!).then(canvas => {
            const imgUrl = canvas.toDataURL('image/jpeg');
            const image = document.createElement('img');
            image.src = imgUrl;
            const a = document.createElement('a');
            a.href = imgUrl;
            a.download = 'match';
            a.click();
        });
    }
    
    /**
     * Updates the results of an existing match.
     *
     * @param match The match to update.
     */
    public updateMatch(match: Match): void {
        //  TODO: finish this function (update win/loss/forfeit, scoreboard in round-robin, etc.)

        const matchContainer = document.querySelector(`[data-match-id='${match.id}']`);
        if (!matchContainer) throw Error('Match not found.');

        matchContainer.setAttribute('data-match-status', match.status.toString());

        const result1 = matchContainer.querySelector('.participant:nth-of-type(1) .result');
        if (result1 && match.opponent1?.score) result1.innerHTML = match.opponent1?.score?.toString();

        const result2 = matchContainer.querySelector('.participant:nth-of-type(2) .result');
        if (result2 && match.opponent2?.score) result2.innerHTML = match.opponent2?.score?.toString();
    }

    /**
     * Updates the results of an existing match.
     *
     * @param match The match to update.
     */
    public updateRound(round: Round): void {
        //  TODO: finish this function (update win/loss/forfeit, scoreboard in round-robin, etc.)

        const roundContainer = document.querySelector(`[data-round-id='${round.id}']`);
        if (!roundContainer) throw Error('Round not found.');

        const title = roundContainer.querySelector('h3');
        // @ts-ignore
        if (title && round.title) title.innerHTML = round.title;

        // matchContainer.setAttribute('data-match-status', match.status.toString());

        // const result1 = matchContainer.querySelector('.participant:nth-of-type(1) .result');
        // if (result1 && match.opponent1?.score) result1.innerHTML = match.opponent1?.score?.toString();

        // const result2 = matchContainer.querySelector('.participant:nth-of-type(2) .result');
        // if (result2 && match.opponent2?.score) result2.innerHTML = match.opponent2?.score?.toString();
    }

    /**
     * Sets the images which will be rendered for every participant.
     *
     * @param images The participant images.
     */
    public setParticipantImages(images: ParticipantImage[]): void {
        this.participantImages = images;
    }

    /**
     * Adds a locale to the available i18n bundles.
     *
     * @param name Name of the locale.
     * @param locale Contents of the locale.
     */
    public addLocale(name: string, locale: Locale): void {
        lang.addLocale(name, locale);
    }

    /**
     * Renders a stage (round-robin, single or double elimination).
     *
     * @param root The root element.
     * @param data The data to display.
     */
    private renderStage(root: DocumentFragment, data: ViewerData): void {
        const stage = data.stages[0];
        const matchesByGroup = splitBy(data.matches, 'group_id');

        this.stage = stage;
        this.skipFirstRound = stage.settings.skipFirstRound || false;

        switch (stage.type) {
            case 'round_robin':
                this.renderRoundRobin(root, stage, matchesByGroup);
                break;
            case 'single_elimination':
            case 'double_elimination':
                this.renderElimination(root, stage, matchesByGroup);
                break;
            default:
                throw Error(`Unknown bracket type: ${stage.type}`);
        }
    }

    /**
     * Renders a round-robin stage.
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderRoundRobin(root: DocumentFragment, stage: Stage, matchesByGroup: Match[][]): void {
        const container = dom.createRoundRobinContainer(stage.id);
        if (this.config.showTitle)
            container.append(dom.createTitle(stage.name));

        let groupNumber = 1;

        for (const groupMatches of matchesByGroup) {
            const groupId = groupMatches[0].group_id;
            const groupContainer = dom.createGroupContainer(groupId, lang.getGroupName(groupNumber++));
            const matchesByRound = splitBy(groupMatches, 'round_id');

            let roundNumber = 1;

            for (const roundMatches of matchesByRound) {
                const roundId = roundMatches[0].round_id;
                const roundContainer = dom.createRoundContainer(roundId, lang.getRoundName(roundNumber++, 0));

                for (const match of roundMatches)
                    roundContainer.append(this.createMatch(match));

                groupContainer.append(roundContainer);
            }

            groupContainer.append(this.createRanking(groupMatches));
            container.append(groupContainer);
        }

        root.append(container);
    }

    /**
     * Renders an elimination stage (single or double).
     *
     * @param root The root element.
     * @param stage The stage to render.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderElimination(root: DocumentFragment, stage: Stage, matchesByGroup: Match[][]): void {
        const container = dom.createEliminationContainer(stage.id, this.config.width, this.config.height);
        
        if (this.config.showTitle)
            container.append(dom.createTitle(stage.name));
        
        if (this.config.showTools)
            container.append(dom.createTools(this.screenshot));

        if (stage.type === 'single_elimination')
            this.renderSingleElimination(container, matchesByGroup);
        else
            this.renderDoubleElimination(container, matchesByGroup);

        root.append(container);
    }

    /**
     * Renders a single elimination stage.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderSingleElimination(container: HTMLElement, matchesByGroup: Match[][]): void {
        const hasFinal = matchesByGroup[1] !== undefined;
        this.renderBracket(container, splitBy(matchesByGroup[0], 'round_id'), lang.getRoundName, 'single-bracket');

        if (hasFinal)
            this.renderFinal(container, 'consolation_final', matchesByGroup[1]);
    }

    /**
     * Renders a double elimination stage.
     *
     * @param container The container to render into.
     * @param matchesByGroup A list of matches for each group.
     */
    private renderDoubleElimination(container: HTMLElement, matchesByGroup: Match[][]): void {
        const hasLoserBracket = matchesByGroup[1] !== undefined;
        const hasFinal = matchesByGroup[2] !== undefined;

        this.renderBracket(container, splitBy(matchesByGroup[0], 'round_id'), lang.getWinnerBracketRoundName, 'winner-bracket', hasFinal);

        if (hasLoserBracket)
            this.renderBracket(container, splitBy(matchesByGroup[1], 'round_id'), lang.getLoserBracketRoundName, 'loser-bracket');

        if (hasFinal)
            this.renderFinal(container, 'grand_final', matchesByGroup[2]);
    }

    /**
     * Renders a bracket.
     *
     * @param container The container to render into.
     * @param matchesByRound A list of matches for each round.
     * @param roundName A function giving a round's name based on its number.
     * @param bracketType Type of the bracket.
     * @param connectFinal Whether to connect the last match of the bracket to the final.
     */
    private renderBracket(container: HTMLElement, matchesByRound: Match[][], roundName: RoundName, bracketType: BracketType, connectFinal?: boolean): void {
        const groupId = matchesByRound[0][0].group_id;
        const roundCount = matchesByRound.length;
        const bracketContainer = dom.createBracketContainer(groupId, lang.getBracketName(this.stage, bracketType));
        const roundsContainer = dom.createRoundsContainer();

        const { matches: completedMatches, fromToornament } = completeWithBlankMatches(bracketType, matchesByRound[0], matchesByRound[1]);

        this.alwaysConnectFirstRound = !fromToornament;

        for (let roundIndex = 0; roundIndex < matchesByRound.length; roundIndex++) {
            const roundId = matchesByRound[roundIndex][0].round_id;
            const roundNumber = roundIndex + 1;
            const round = this.rounds.find(round => round.id === roundId) ??
                { id: roundId, stage_id: 1, group_id: 1, number: roundNumber, title: '', complete_percent: '--' };
            // @ts-ignore
            const title = round.title ?? roundName(roundNumber, roundCount);
            // @ts-ignore
            const roundContainer = dom.createRoundContainer(roundId, title, round?.complete_percent, round.played_at, () => this._onRoundClick(round));

            const roundMatches = fromToornament && roundNumber === 1 ? completedMatches : matchesByRound[roundIndex];

            for (const match of roundMatches)
                roundContainer.append(match && this.createBracketMatch(roundNumber, roundCount, match, bracketType, connectFinal) || this.skipBracketMatch());

            roundsContainer.append(roundContainer);
        }

        bracketContainer.append(roundsContainer);
        container.append(bracketContainer);
    }

    /**
     * Renders a final group.
     *
     * @param container The container to render into.
     * @param finalType Type of the final.
     * @param matches Matches of the final.
     */
    private renderFinal(container: HTMLElement, finalType: FinalType, matches: Match[]): void {
        const upperBracket = container.querySelector('.bracket .rounds');
        if (!upperBracket) throw Error('Upper bracket not found.');

        const winnerWb = matches[0].opponent1;
        const displayCount = winnerWb?.id === null || winnerWb?.result === 'win' ? 1 : 2;
        const finalMatches = matches.slice(0, displayCount);

        const roundCount = matches.length;

        for (let roundIndex = 0; roundIndex < finalMatches.length; roundIndex++) {
            const roundNumber = roundIndex + 1;
            const roundId = finalMatches[roundIndex].round_id;
            const round = this.rounds.find(round => round.id === roundId) ??
                { id: roundId, stage_id: 1, group_id: 1, number: roundNumber, title: '' };
            // @ts-ignore
            const title = round.title ?? lang.getFinalMatchLabel(finalType, roundNumber, roundCount);
            // @ts-ignore
            const roundContainer = dom.createRoundContainer(roundId, title, round?.complete_percent, round.played_at, () => this._onRoundClick(round));
            roundContainer.append(this.createFinalMatch(finalType, finalMatches, roundNumber, roundCount));
            upperBracket.append(roundContainer);
        }
    }

    /**
     * Creates a ranking table based on matches of a round-robin stage.
     *
     * @param matches The list of matches.
     */
    private createRanking(matches: Match[]): HTMLElement {
        const table = dom.createTable();
        const ranking = getRanking(matches);

        table.append(dom.createRankingHeaders(ranking));

        for (const item of ranking)
            table.append(this.createRankingRow(item));

        return table;
    }

    /**
     * Creates a row of the ranking table.
     *
     * @param item Item of the ranking.
     */
    private createRankingRow(item: RankingItem): HTMLElement {
        const row = dom.createRow();
        const notRanked = item.played === 0;

        for (const key in item) {
            const prop = key as keyof RankingItem;
            const data = item[prop];

            if (prop === 'id') {
                const participant = this.participants.find(participant => participant.id === data);

                if (participant !== undefined) {
                    const cell = dom.createCell(participant.name);
                    this.setupMouseHover(participant.id, cell);
                    row.append(cell);
                    continue;
                }
            }

            if (notRanked && (prop === 'rank' || prop === 'points')) {
                row.append(dom.createCell('-'));
                continue;
            }

            row.append(dom.createCell(data));
        }

        return row;
    }

    /**
     * Creates a match in a bracket.
     *
     * @param roundNumber Number of the round.
     * @param roundCount Count of rounds.
     * @param match Information about the match.
     * @param matchLocation Location of the match.
     * @param connectFinal Whether to connect this match to the final if it happens to be the last one of the bracket.
     */
    private createBracketMatch(roundNumber: number, roundCount: number, match: Match, matchLocation: BracketType, connectFinal?: boolean): HTMLElement {
        const connection = dom.getBracketConnection(this.alwaysConnectFirstRound, roundNumber, roundCount, match, matchLocation, connectFinal);
        const matchLabel = lang.getMatchLabel(match.number, roundNumber, roundCount, matchLocation);
        const originHint = lang.getOriginHint(roundNumber, roundCount, this.skipFirstRound, matchLocation);
        return this.createMatch(match, matchLocation, connection, matchLabel, originHint);
    }

    /**
     * Creates a match in a final.
     *
     * @param type Type of the final.
     * @param matches Matches of the final.
     * @param roundNumber Number of the round.
     * @param roundCount Count of rounds.
     */
    private createFinalMatch(type: FinalType, matches: Match[], roundNumber: number, roundCount: number): HTMLElement {
        const roundIndex = roundNumber - 1;
        const connection = dom.getFinalConnection(type, roundNumber, matches.length);
        const matchLabel = lang.getFinalMatchLabel(type, roundNumber, roundCount);
        const originHint = lang.getFinalOriginHint(type, roundNumber);
        return this.createMatch(matches[roundIndex], 'final-group', connection, matchLabel, originHint);
    }

    /**
     * Creates a hidden empty match to act as a placeholder.
     */
    private skipBracketMatch(): HTMLElement {
        const matchContainer = dom.createMatchContainer();
        const opponents = dom.createOpponentsContainer();

        const participant1 = this.createParticipant(null);
        const participant2 = this.createParticipant(null);

        opponents.append(participant1, participant2);
        matchContainer.append(opponents);
        matchContainer.style.visibility = 'hidden';

        return matchContainer;
    }

    /**
     * Creates a match based on its results.
     *
     * @param match Results of the match.
     * @param matchLocation Location of the match.
     * @param connection Connection of this match with the others.
     * @param label Label of the match.
     * @param originHint Origin hint for the match.
     * @param roundNumber Number of the round.
     */
    private createMatch(match: Match, matchLocation?: BracketType, connection?: Connection, label?: string, originHint?: OriginHint): HTMLElement {
        const matchContainer = dom.createMatchContainer(match.id, match.status);
        const opponents = dom.createOpponentsContainer(() => this._onMatchClick(match));

        if (match.status >= Status.Completed)
            originHint = undefined;

        const participant1 = this.createParticipant(match.opponent1, 'opponent1', originHint, matchLocation);
        const participant2 = this.createParticipant(match.opponent2, 'opponent2', originHint, matchLocation);

        this.renderMatchLabel(opponents, match, label);
        opponents.append(participant1, participant2);
        
        // @ts-ignore
        if(match.ext && match.ext.length > 0) {
            // @ts-ignore
            const statusBox = createMatchStatus(match.ext);
            opponents.appendChild(statusBox);
        }
        
        matchContainer.append(opponents);

        if (!connection)
            return matchContainer;

        dom.setupConnection(opponents, matchContainer, connection);
        this.setupMouseHoverMatch(match, matchContainer);
        return matchContainer;
    }

    /**
     * Creates a participant for a match.
     *
     * @param participant Information about the participant.
     * @param side Side of the participant.
     * @param originHint Origin hint for the match.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private createParticipant(participant: ParticipantResult | null, side?: Side, originHint?: OriginHint, matchLocation?: BracketType): HTMLElement {
        const p = this.participants.find(p => p.id === participant?.id);
    
        const containers: ParticipantContainers = {
            // @ts-ignore
            participant: dom.createParticipantContainer(participant && participant.id, p?.seeder),
            name: dom.createNameContainer(),
            result: dom.createResultContainer(),
        };

        if (participant === null || participant === undefined)
            dom.setupBye(containers.name);
        else
            this.renderParticipant(containers, participant, side, originHint, matchLocation);

        containers.participant.append(containers.name, containers.result);

        if (participant && participant.id !== null)
            this.setupMouseHover(participant.id, containers.participant);

        return containers.participant;
    }

    /**
     * Renders a participant.
     *
     * @param containers Containers for the participant.
     * @param participant The participant result.
     * @param side Side of the participant.
     * @param originHint Origin hint for the match.
     * @param matchLocation Location of the match.
     * @param roundNumber Number of the round.
     */
    private renderParticipant(containers: ParticipantContainers, participant: ParticipantResult, side?: Side, originHint?: OriginHint, matchLocation?: BracketType): void {
        const found = this.participants.find(item => item.id === participant.id);

        if (found) {
            containers.name.innerHTML = found.name;
            
            containers.participant.setAttribute('title', found.name);
            // @ts-ignore
            if(found.img) {
                // @ts-ignore
                dom.addParticipantImage(containers.name, found.img);
            }
            this.renderParticipantOrigin(containers.participant, participant, side, matchLocation);
        } else
            this.renderHint(containers.name, participant, originHint, matchLocation);

        containers.result.innerText = `${participant.score === undefined ? '-' : participant.score}`;

        dom.setupWin(containers.participant, containers.result, participant);
        dom.setupLoss(containers.participant, containers.result, participant);
    }

    /**
     * Renders a match label.
     *
     * @param opponents The opponents container.
     * @param match Results of the match.
     * @param label Label of the match.
     */
    private renderMatchLabel(opponents: HTMLElement, match: Match, label?: string): void {
        const childCountLabel = `Bo${match.child_count}`;

        label = label || '';

        if (this.config.separatedChildCountLabel) {
            opponents.append(dom.createMatchLabel(label, lang.getMatchStatus(match.status)));

            if (match.child_count > 0)
                opponents.append(dom.createChildCountLabel(lang.t('common.best-of-x', { x: match.child_count })));

            return;
        }

        if (match.child_count > 0) {
            const joined = label ? `${label}, ${childCountLabel}` : childCountLabel;
            opponents.append(dom.createMatchLabel(joined, lang.getMatchStatus(match.status)));
        }
    }

    /**
     * Renders an origin hint for a participant.
     *
     * @param nameContainer The name container.
     * @param participant The participant result.
     * @param originHint Origin hint for the participant.
     * @param matchLocation Location of the match.
     */
    private renderHint(nameContainer: HTMLElement, participant: ParticipantResult, originHint?: OriginHint, matchLocation?: BracketType): void {
        if (originHint === undefined || participant.position === undefined) return;
        if (!this.config.showSlotsOrigin) return;
        if (!this.config.showLowerBracketSlotsOrigin && matchLocation === 'loser-bracket') return;

        dom.setupHint(nameContainer, originHint(participant.position));
    }

    /**
     * Renders a participant's origin.
     *
     * @param nameContainer The name container.
     * @param participant The participant result.
     * @param side Side of the participant.Side of the participant.
     * @param matchLocation Location of the match.
     */
    private renderParticipantOrigin(nameContainer: HTMLElement, participant: ParticipantResult, side?: Side, matchLocation?: BracketType): void {
        if (matchLocation === undefined) return;
        if (!this.config.participantOriginPlacement || this.config.participantOriginPlacement === 'none') return;
        if (!this.config.showSlotsOrigin) return;
        if (!this.config.showLowerBracketSlotsOrigin && matchLocation === 'loser-bracket') return;

        // const abbreviation = getOriginAbbreviation(matchLocation, this.skipFirstRound, roundNumber, side);
        // if (!abbreviation) return;

        // const origin = abbreviation + participant.position;
        dom.addParticipantOrigin(nameContainer, `${participant.position ?? '-'}`, this.config.participantOriginPlacement);
    }

    /**
     * Sets mouse hover events for a participant.
     *
     * @param participantId ID of the participant.
     * @param element The dom element to add events to.
     */
    private setupMouseHover(participantId: number, element: HTMLElement): void {
        if (!this.config.highlightParticipantOnHover) return;

        const refs = this.participantRefs[participantId];
        if (!refs) throw Error(`The participant (id: ${participantId}) does not exist in the participants table.`);

        refs.push(element);

        element.addEventListener('mouseover', () => {
            refs.forEach(el => el.classList.add('hover'));
        });

        element.addEventListener('mouseleave', () => {
            refs.forEach(el => el.classList.remove('hover'));
        });
    }

    /**
     * Sets mouse hover events for a match.
     *
     * @param participantId ID of the participant.
     * @param element The dom element to add events to.
     */
    private setupMouseHoverMatch(match: Match, element: HTMLElement): void {
        element.addEventListener('mouseover', () => {
            // refs.forEach(el => el.classList.add('hover'));
            // console.log("Match mouseover: ");
        });

        element.addEventListener('mouseleave', () => {
            // refs.forEach(el => el.classList.remove('hover'));
            // console.log("Match mouseleave: ");

        });
    }
}
